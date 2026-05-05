// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal, computed, Signal, inject } from '@angular/core';
import {
  Canvas,
  Rect,
  Circle,
  Line,
  Textbox,
  FabricImage,
  PencilBrush,
  FabricObject,
  Point,
  Polygon,
  Polyline,
  Group,
  Triangle,
} from 'fabric';
import { IFloorPlanWorkMarker } from 'src/app/domain/models/floor-plan/floor-plan-work-marker-class';
import { FloorPlanMarkerType } from 'src/app/domain/enums/floor-plan-marker-type.enum';
import { ArrowType } from './floor-plan-tool.service';
import { FloorPlanLayerService } from './floor-plan-layer.service';
import { FloorPlanToolService, ConnectorType } from './floor-plan-tool.service';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 10;
const ZOOM_STEP = 0.1;
const ZOOM_WHEEL_FACTOR = 0.999;
const HISTORY_MAX = 50;

@Injectable()
export class FloorPlanCanvasService {
  private canvas: Canvas | null = null;
  private layerService = inject(FloorPlanLayerService);
  private toolService = inject(FloorPlanToolService);

  private readonly _zoom = signal(1);
  private readonly _selectedObject = signal<FabricObject | null>(null);
  private readonly _isPanning = signal(false);
  private readonly _canvasReady = signal(false);
  private readonly _undoStack = signal<string[]>([]);
  private readonly _redoStack = signal<string[]>([]);

  readonly zoom: Signal<number> = this._zoom.asReadonly();
  readonly selectedObject: Signal<FabricObject | null> = this._selectedObject.asReadonly();
  readonly isPanning: Signal<boolean> = this._isPanning.asReadonly();
  readonly canvasReady: Signal<boolean> = this._canvasReady.asReadonly();
  readonly canUndo: Signal<boolean> = computed(() => this._undoStack().length > 0);
  readonly canRedo: Signal<boolean> = computed(() => this._redoStack().length > 0);

  private isPanningActive = false;
  private lastPanPoint: Point | null = null;

  private polygonPoints: { x: number; y: number }[] = [];
  private tempPolyline: Polyline | null = null;
  private isPolygonDrawing = false;

  initCanvas(canvasElement: HTMLCanvasElement, width: number, height: number): void {
    if (this.canvas) {
      this.canvas.dispose();
    }

    this.canvas = new Canvas(canvasElement, {
      width,
      height,
      backgroundColor: '#ffffff',
    });

    this.saveHistory();
    this.bindEvents();
    this._canvasReady.set(true);
  }

  disposeCanvas(): void {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
    this._canvasReady.set(false);
    this._selectedObject.set(null);
  }

  private assignToActiveLayer(obj: FabricObject): void {
    const activeLayerId = this.layerService.activeLayerId();
    if (!activeLayerId) return;
    const existingData = (obj as any).data ?? {};
    obj.set('data', { ...existingData, layerId: activeLayerId });
  }

  private snap(value: number): number {
    if (!this.toolService.snapEnabled()) return value;
    const size = this.toolService.snapSize();
    if (size <= 0) return value;
    return Math.round(value / size) * size;
  }

  syncLayerState(): void {
    if (!this.canvas) return;
    const layers = this.layerService.layers();
    const layerMap = new Map(layers.map((l) => [l.id, l]));

    for (const obj of this.canvas.getObjects()) {
      const data = (obj as any).data;
      const layerId = data?.layerId;
      if (!layerId) continue;

      const layer = layerMap.get(layerId);
      if (!layer) continue;

      const isVisible = layer.visible;
      const isLocked = layer.locked;

      obj.set({
        visible: isVisible,
        selectable: !isLocked,
        evented: !isLocked,
        lockMovementX: isLocked,
        lockMovementY: isLocked,
        lockRotation: isLocked,
        lockScalingX: isLocked,
        lockScalingY: isLocked,
      });
    }

    this.canvas.renderAll();
  }

  setObjectLayer(obj: FabricObject, layerId: string): void {
    const existingData = (obj as any).data ?? {};
    obj.set('data', { ...existingData, layerId });
    this.syncLayerState();
  }

  private bindEvents(): void {
    if (!this.canvas) return;

    this.canvas.on('selection:created', (e) => {
      this._selectedObject.set(e.selected?.[0] ?? null);
    });

    this.canvas.on('selection:updated', (e) => {
      this._selectedObject.set(e.selected?.[0] ?? null);
    });

    this.canvas.on('selection:cleared', () => {
      this._selectedObject.set(null);
    });

    this.canvas.on('object:modified', () => {
      this.saveHistory();
    });

    this.canvas.on('object:added', () => {
      this.saveHistory();
    });

    this.canvas.on('object:removed', () => {
      this.saveHistory();
    });

    this.canvas.on('path:created', (opt) => {
      const path = opt.path;
      if (path) {
        this.assignToActiveLayer(path);
      }
    });

    this.canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = this.canvas!.getZoom();
      zoom *= ZOOM_WHEEL_FACTOR ** delta;
      zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
      const point = new Point(opt.e.offsetX, opt.e.offsetY);
      this.canvas!.zoomToPoint(point, zoom);
      this._zoom.set(zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    this.canvas.on('mouse:down', (opt) => {
      const e = opt.e as MouseEvent;
      if (e.altKey || e.button === 1) {
        this.isPanningActive = true;
        this.lastPanPoint = new Point(e.clientX, e.clientY);
        this._isPanning.set(true);
        this.canvas!.setCursor('grabbing');
      }
    });

    this.canvas.on('mouse:move', (opt) => {
      if (!this.isPanningActive || !this.lastPanPoint) return;
      const e = opt.e as MouseEvent;
      const current = new Point(e.clientX, e.clientY);
      const delta = current.subtract(this.lastPanPoint);
      this.canvas!.relativePan(delta);
      this.lastPanPoint = current;
    });

    this.canvas.on('mouse:up', () => {
      if (this.isPanningActive) {
        this.isPanningActive = false;
        this.lastPanPoint = null;
        this._isPanning.set(false);
        this.canvas!.setCursor('default');
      }
    });

    this.canvas.on('object:moving', (opt) => {
      if (!this.toolService.snapEnabled()) return;
      const obj = opt.target;
      if (!obj) return;
      const size = this.toolService.snapSize();
      if (size <= 0) return;
      obj.set({
        left: Math.round((obj.left ?? 0) / size) * size,
        top: Math.round((obj.top ?? 0) / size) * size,
      });
    });

    this.canvas.on('object:scaling', (opt) => {
      if (!this.toolService.snapEnabled()) return;
      const obj = opt.target;
      if (!obj) return;
      const size = this.toolService.snapSize();
      if (size <= 0) return;
      const scaledWidth = (obj.width ?? 0) * (obj.scaleX ?? 1);
      const scaledHeight = (obj.height ?? 0) * (obj.scaleY ?? 1);
      const snappedWidth = Math.round(scaledWidth / size) * size;
      const snappedHeight = Math.round(scaledHeight / size) * size;
      if (scaledWidth !== 0) {
        obj.set('scaleX', snappedWidth / (obj.width ?? 1));
      }
      if (scaledHeight !== 0) {
        obj.set('scaleY', snappedHeight / (obj.height ?? 1));
      }
    });
  }

  zoomIn(): void {
    this.setZoom(Math.min(this._zoom() + ZOOM_STEP, ZOOM_MAX));
  }

  zoomOut(): void {
    this.setZoom(Math.max(this._zoom() - ZOOM_STEP, ZOOM_MIN));
  }

  zoomToFit(): void {
    if (!this.canvas) return;
    const objects = this.canvas.getObjects();
    if (objects.length === 0) {
      this.resetZoom();
      return;
    }
    this.canvas.setZoom(1);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach((obj) => {
      const bound = obj.getBoundingRect();
      minX = Math.min(minX, bound.left);
      minY = Math.min(minY, bound.top);
      maxX = Math.max(maxX, bound.left + bound.width);
      maxY = Math.max(maxY, bound.top + bound.height);
    });
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    if (boundsWidth === 0 || boundsHeight === 0) return;
    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();
    const scaleX = canvasWidth / boundsWidth;
    const scaleY = canvasHeight / boundsHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale));
    this.canvas.setZoom(newZoom);
    this._zoom.set(newZoom);
  }

  resetZoom(): void {
    this.setZoom(1);
    if (this.canvas) {
      this.canvas.absolutePan(new Point(0, 0));
    }
  }

  setZoom(level: number): void {
    if (!this.canvas) return;
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, level));
    const center = new Point(this.canvas.getWidth() / 2, this.canvas.getHeight() / 2);
    this.canvas.zoomToPoint(center, clamped);
    this._zoom.set(clamped);
  }

  addRect(): void {
    if (!this.canvas) return;
    const rect = new Rect({
      left: this.snap(100),
      top: this.snap(100),
      width: this.snap(120),
      height: this.snap(80),
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    this.assignToActiveLayer(rect);
    this.canvas.add(rect);
    this.canvas.setActiveObject(rect);
    this.canvas.renderAll();
  }

  addCircle(): void {
    if (!this.canvas) return;
    const circle = new Circle({
      left: this.snap(100),
      top: this.snap(100),
      radius: this.snap(50),
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    this.assignToActiveLayer(circle);
    this.canvas.add(circle);
    this.canvas.setActiveObject(circle);
    this.canvas.renderAll();
  }

  addLine(): void {
    if (!this.canvas) return;
    const snap = this.snap.bind(this);
    const line = new Line([snap(50), snap(50), snap(200), snap(50)], {
      stroke: '#000000',
      strokeWidth: 2,
    });
    this.assignToActiveLayer(line);
    this.canvas.add(line);
    this.canvas.setActiveObject(line);
    this.canvas.renderAll();
  }

  addArrow(): void {
    const arrowType = this.toolService.arrowType();
    switch (arrowType) {
      case ArrowType.Double:
        this.addDoubleArrow();
        break;
      case ArrowType.Open:
        this.addOpenArrow();
        break;
      case ArrowType.Diamond:
        this.addDiamondArrow();
        break;
      case ArrowType.Curved:
        this.addCurvedArrow();
        break;
      case ArrowType.Simple:
      default:
        this.addSimpleArrow();
        break;
    }
  }

  private addSimpleArrow(): void {
    if (!this.canvas) return;
    const strokeColor = this.toolService.strokeColor();
    const strokeWidth = this.toolService.strokeWidth();
    const snap = this.snap.bind(this);

    const x1 = snap(50), y1 = snap(50), x2 = snap(200), y2 = snap(50);
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

    const line = new Line([x1, y1, x2, y2], {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    const arrowHead = new Triangle({
      left: x2,
      top: y2,
      width: Math.max(12, strokeWidth * 4),
      height: Math.max(12, strokeWidth * 4),
      fill: strokeColor,
      angle: angle + 90,
      originX: 'center',
      originY: 'center',
    });

    const group = new Group([line, arrowHead], {
      left: snap(100),
      top: snap(100),
    });

    this.assignToActiveLayer(group);
    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
  }

  private addDoubleArrow(): void {
    if (!this.canvas) return;
    const strokeColor = this.toolService.strokeColor();
    const strokeWidth = this.toolService.strokeWidth();
    const snap = this.snap.bind(this);

    const x1 = snap(50), y1 = snap(50), x2 = snap(200), y2 = snap(50);
    const angleStart = Math.atan2(y1 - y2, x1 - x2) * (180 / Math.PI);
    const angleEnd = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    const headSize = Math.max(12, strokeWidth * 4);

    const line = new Line([x1, y1, x2, y2], {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    const headStart = new Triangle({
      left: x1,
      top: y1,
      width: headSize,
      height: headSize,
      fill: strokeColor,
      angle: angleStart + 90,
      originX: 'center',
      originY: 'center',
    });

    const headEnd = new Triangle({
      left: x2,
      top: y2,
      width: headSize,
      height: headSize,
      fill: strokeColor,
      angle: angleEnd + 90,
      originX: 'center',
      originY: 'center',
    });

    const group = new Group([line, headStart, headEnd], {
      left: snap(100),
      top: snap(100),
    });

    this.assignToActiveLayer(group);
    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
  }

  private addOpenArrow(): void {
    if (!this.canvas) return;
    const strokeColor = this.toolService.strokeColor();
    const strokeWidth = this.toolService.strokeWidth();
    const snap = this.snap.bind(this);

    const x1 = snap(50), y1 = snap(50), x2 = snap(200), y2 = snap(50);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = Math.max(12, strokeWidth * 4);
    const headAngle = Math.PI / 6;

    const line = new Line([x1, y1, x2, y2], {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    const wing1 = new Line([x2, y2, x2 - headLen * Math.cos(angle - headAngle), y2 - headLen * Math.sin(angle - headAngle)], {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    const wing2 = new Line([x2, y2, x2 - headLen * Math.cos(angle + headAngle), y2 - headLen * Math.sin(angle + headAngle)], {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    const group = new Group([line, wing1, wing2], {
      left: snap(100),
      top: snap(100),
    });

    this.assignToActiveLayer(group);
    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
  }

  private addDiamondArrow(): void {
    if (!this.canvas) return;
    const strokeColor = this.toolService.strokeColor();
    const strokeWidth = this.toolService.strokeWidth();
    const snap = this.snap.bind(this);

    const x1 = snap(50), y1 = snap(50), x2 = snap(200), y2 = snap(50);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = Math.max(12, strokeWidth * 4);

    const line = new Line([x1, y1, x2, y2], {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    const diamond = new Polygon([
      { x: headLen * Math.cos(angle), y: headLen * Math.sin(angle) },
      { x: headLen * 0.5 * Math.cos(angle - Math.PI / 2), y: headLen * 0.5 * Math.sin(angle - Math.PI / 2) },
      { x: -headLen * 0.3 * Math.cos(angle), y: -headLen * 0.3 * Math.sin(angle) },
      { x: headLen * 0.5 * Math.cos(angle + Math.PI / 2), y: headLen * 0.5 * Math.sin(angle + Math.PI / 2) },
    ], {
      left: x2,
      top: y2,
      fill: strokeColor,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    const group = new Group([line, diamond], {
      left: snap(100),
      top: snap(100),
    });

    this.assignToActiveLayer(group);
    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
  }

  private addCurvedArrow(): void {
    if (!this.canvas) return;
    const strokeColor = this.toolService.strokeColor();
    const strokeWidth = this.toolService.strokeWidth();
    const snap = this.snap.bind(this);

    const x1 = snap(50), y1 = snap(50), x2 = snap(200), y2 = snap(50);
    const cx = snap(125), cy = snap(100);
    const headLen = Math.max(12, strokeWidth * 4);

    // Approximate quadratic bezier with a polyline
    const curvePoints: { x: number; y: number }[] = [];
    const segments = 30;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const mt = 1 - t;
      const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
      const y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
      curvePoints.push({ x, y });
    }

    const curve = new Polyline(curvePoints, {
      fill: '',
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    const angle = Math.atan2(y2 - cy, x2 - cx);
    const arrowHead = new Triangle({
      left: x2,
      top: y2,
      width: headLen,
      height: headLen,
      fill: strokeColor,
      angle: angle * (180 / Math.PI) + 90,
      originX: 'center',
      originY: 'center',
    });

    const group = new Group([curve, arrowHead], {
      left: snap(100),
      top: snap(50),
    });

    this.assignToActiveLayer(group);
    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
  }

  createConnector(startX: number, startY: number, endX: number, endY: number, type: ConnectorType): string {
    if (!this.canvas) return '';
    const connectorId = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const strokeColor = this.toolService.strokeColor();
    const strokeWidth = this.toolService.strokeWidth();

    const pathObj = this.buildConnectorPath(startX, startY, endX, endY, type, strokeColor, strokeWidth);
    pathObj.set('data', { connectorId, isConnector: true, isConnectorPath: true, connectorType: type });
    this.assignToActiveLayer(pathObj);
    this.canvas.add(pathObj);

    const startHandle = new Circle({
      left: startX,
      top: startY,
      radius: 6,
      fill: '#2563eb',
      stroke: '#ffffff',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      selectable: true,
      hasBorders: false,
      hasControls: false,
    });
    startHandle.set('data', { connectorId, isConnector: true, isConnectorHandle: true, isStartHandle: true });
    this.canvas.add(startHandle);

    const endHandle = new Circle({
      left: endX,
      top: endY,
      radius: 6,
      fill: '#2563eb',
      stroke: '#ffffff',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      selectable: true,
      hasBorders: false,
      hasControls: false,
    });
    endHandle.set('data', { connectorId, isConnector: true, isConnectorHandle: true, isStartHandle: false });
    this.canvas.add(endHandle);

    this.canvas.renderAll();
    return connectorId;
  }

  updateConnectorPath(connectorId: string): void {
    if (!this.canvas) return;
    const objects = this.canvas.getObjects();
    let pathObj: FabricObject | null = null;
    let startHandle: FabricObject | null = null;
    let endHandle: FabricObject | null = null;

    for (const obj of objects) {
      const data = (obj as any).data;
      if (data?.connectorId === connectorId) {
        if (data.isConnectorPath) pathObj = obj;
        if (data.isConnectorHandle && data.isStartHandle) startHandle = obj;
        if (data.isConnectorHandle && !data.isStartHandle) endHandle = obj;
      }
    }

    if (!pathObj || !startHandle || !endHandle) return;

    const data = (pathObj as any).data;
    const type = data?.connectorType as ConnectorType ?? ConnectorType.Straight;
    const strokeColor = (pathObj as any).stroke as string ?? '#000000';
    const strokeWidth = (pathObj as any).strokeWidth as number ?? 2;

    const newPath = this.buildConnectorPath(
      startHandle.left ?? 0,
      startHandle.top ?? 0,
      endHandle.left ?? 0,
      endHandle.top ?? 0,
      type,
      strokeColor,
      strokeWidth
    );

    newPath.set('data', data);
    this.canvas.remove(pathObj);
    this.canvas.add(newPath);
    this.canvas.bringObjectToFront(startHandle);
    this.canvas.bringObjectToFront(endHandle);
    this.canvas.renderAll();
  }

  deleteConnector(connectorId: string): void {
    if (!this.canvas) return;
    const toRemove = this.canvas.getObjects().filter((obj) => (obj as any).data?.connectorId === connectorId);
    toRemove.forEach((obj) => this.canvas!.remove(obj));
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  private buildConnectorPath(
    x1: number, y1: number, x2: number, y2: number,
    type: ConnectorType, stroke: string, strokeWidth: number
  ): FabricObject {
    switch (type) {
      case ConnectorType.Orthogonal: {
        const midX = (x1 + x2) / 2;
        const points = [
          { x: x1, y: y1 },
          { x: midX, y: y1 },
          { x: midX, y: y2 },
          { x: x2, y: y2 },
        ];
        return new Polyline(points, { fill: '', stroke, strokeWidth });
      }
      case ConnectorType.Curved: {
        const segments = 30;
        const points: { x: number; y: number }[] = [];
        const cp1x = x1 + (x2 - x1) * 0.5;
        const cp1y = y1;
        const cp2x = x1 + (x2 - x1) * 0.5;
        const cp2y = y2;
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const mt = 1 - t;
          const x = mt * mt * mt * x1 + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * x2;
          const y = mt * mt * mt * y1 + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * y2;
          points.push({ x, y });
        }
        return new Polyline(points, { fill: '', stroke, strokeWidth });
      }
      case ConnectorType.Straight:
      default: {
        return new Line([x1, y1, x2, y2], { stroke, strokeWidth });
      }
    }
  }

  addText(text: string): void {
    if (!this.canvas) return;
    const textbox = new Textbox(text, {
      left: this.snap(100),
      top: this.snap(100),
      fontSize: 16,
      fill: '#000000',
      width: this.snap(200),
    });
    this.assignToActiveLayer(textbox);
    this.canvas.add(textbox);
    this.canvas.setActiveObject(textbox);
    this.canvas.renderAll();
  }

  addPolygon(points: { x: number; y: number }[]): void {
    if (!this.canvas) return;
    const snap = this.snap.bind(this);
    const snappedPoints = points.map((p) => ({ x: snap(p.x), y: snap(p.y) }));
    const polygon = new Polygon(snappedPoints, {
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    this.assignToActiveLayer(polygon);
    this.canvas.add(polygon);
    this.canvas.setActiveObject(polygon);
    this.canvas.renderAll();
  }

  enableFreeDrawing(): void {
    if (!this.canvas) return;
    this.canvas.isDrawingMode = true;
    this.canvas.freeDrawingBrush = new PencilBrush(this.canvas);
    this.canvas.freeDrawingBrush.color = '#000000';
    this.canvas.freeDrawingBrush.width = 2;
  }

  disableFreeDrawing(): void {
    if (!this.canvas) return;
    this.canvas.isDrawingMode = false;
  }

  deleteSelected(): void {
    if (!this.canvas) return;
    const activeObjects = this.canvas.getActiveObjects();
    this.canvas.discardActiveObject();
    activeObjects.forEach((obj) => this.canvas!.remove(obj));
    this.canvas.renderAll();
  }

  toJSON(): string {
    if (!this.canvas) return '{}';
    return JSON.stringify(this.canvas.toJSON());
  }

  async loadFromJSON(json: string): Promise<void> {
    if (!this.canvas) return;
    await this.canvas.loadFromJSON(JSON.parse(json));
    this.syncLayerState();
    this.canvas.renderAll();
  }

  toSVG(): string {
    if (!this.canvas) return '';
    return this.canvas.toSVG();
  }

  async loadFromSVG(svgString: string): Promise<void> {
    if (!this.canvas) return;
    const { loadSVGFromString } = await import('fabric');
    const { objects, options } = await loadSVGFromString(svgString);
    this.canvas.clear();
    objects.forEach((obj) => {
      if (obj) {
        this.assignToActiveLayer(obj);
        this.canvas!.add(obj);
      }
    });
    if (options['width'] && options['height']) {
      this.canvas.setDimensions({ width: options['width'] as number, height: options['height'] as number });
    }
    this.syncLayerState();
    this.canvas.renderAll();
  }

  toDataURL(): string {
    if (!this.canvas) return '';
    return this.canvas.toDataURL({ format: 'png', multiplier: 1 });
  }

  async addImage(url: string): Promise<void> {
    if (!this.canvas) return;
    const img = await FabricImage.fromURL(url);
    img.set({ left: this.snap(100), top: this.snap(100) });
    this.assignToActiveLayer(img);
    this.canvas.add(img);
    this.canvas.setActiveObject(img);
    this.canvas.renderAll();
  }

  async addImageFromFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    await this.addImage(url);
  }

  undo(): void {
    const stack = this._undoStack();
    if (stack.length <= 1) return;
    const current = stack[stack.length - 1];
    const previous = stack[stack.length - 2];
    this._undoStack.set(stack.slice(0, -1));
    this._redoStack.update((r) => [...r, current]);
    this.restoreState(previous);
  }

  redo(): void {
    const redoStack = this._redoStack();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    this._redoStack.set(redoStack.slice(0, -1));
    this._undoStack.update((u) => [...u, next]);
    this.restoreState(next);
  }

  private saveHistory(): void {
    if (!this.canvas) return;
    const state = JSON.stringify(this.canvas.toJSON());
    this._undoStack.update((stack) => {
      const updated = [...stack, state];
      return updated.length > HISTORY_MAX ? updated.slice(updated.length - HISTORY_MAX) : updated;
    });
    this._redoStack.set([]);
  }

  private restoreState(json: string): void {
    if (!this.canvas) return;
    this.canvas.loadFromJSON(JSON.parse(json)).then(() => {
      this.canvas!.renderAll();
    });
  }

  getCanvas(): Canvas | null {
    return this.canvas;
  }

  groupSelected(): void {
    if (!this.canvas) return;
    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length < 2) return;

    this.canvas.discardActiveObject();
    activeObjects.forEach((obj) => this.canvas!.remove(obj));

    const group = new Group(activeObjects);
    this.assignToActiveLayer(group);
    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
  }

  ungroupSelected(): void {
    if (!this.canvas) return;
    const activeObject = this.canvas.getActiveObject();
    if (!(activeObject instanceof Group)) return;

    const group = activeObject as Group;
    this.canvas.discardActiveObject();

    const items = group.getObjects();
    this.canvas.remove(group);

    items.forEach((item) => {
      this.canvas!.add(item);
    });

    this.canvas.renderAll();
  }

  bringToFront(): void {
    if (!this.canvas) return;
    const obj = this.canvas.getActiveObject();
    if (obj) {
      this.canvas.bringObjectToFront(obj);
      this.canvas.renderAll();
    }
  }

  sendToBack(): void {
    if (!this.canvas) return;
    const obj = this.canvas.getActiveObject();
    if (obj) {
      this.canvas.sendObjectToBack(obj);
      this.canvas.renderAll();
    }
  }

  applyStrokeColor(color: string): void {
    if (!this.canvas) return;
    const obj = this.canvas.getActiveObject();
    if (obj) {
      obj.set('stroke', color);
      this.canvas.renderAll();
    }
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = color;
    }
  }

  applyFillColor(color: string): void {
    if (!this.canvas) return;
    const obj = this.canvas.getActiveObject();
    if (obj) {
      obj.set('fill', color);
      this.canvas.renderAll();
    }
  }

  applyStrokeWidth(width: number): void {
    if (!this.canvas) return;
    const obj = this.canvas.getActiveObject();
    if (obj) {
      obj.set('strokeWidth', width);
      this.canvas.renderAll();
    }
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.width = width;
    }
  }

  applyOpacity(opacity: number): void {
    if (!this.canvas) return;
    const obj = this.canvas.getActiveObject();
    if (obj) {
      obj.set('opacity', opacity);
      this.canvas.renderAll();
    }
  }

  renderWorkMarkers(markers: IFloorPlanWorkMarker[]): void {
    if (!this.canvas) return;
    this.removeWorkMarkersFromCanvas();

    for (const marker of markers) {
      this.addWorkMarker(marker);
    }
  }

  addWorkMarker(marker: IFloorPlanWorkMarker): void {
    if (!this.canvas) return;

    const lines: string[] = [];
    if (marker.clientName) lines.push(marker.clientName);
    if (marker.shiftName) lines.push(marker.shiftName);
    if (marker.startTime || marker.endTime) {
      lines.push(`${marker.startTime ?? ''} - ${marker.endTime ?? ''}`);
    }
    if (lines.length === 0 && marker.label) lines.push(marker.label);
    if (lines.length === 0) lines.push('Marker');

    const text = lines.join('\n');
    const fillColor = marker.color || '#000000';
    const bgColor = marker.color ? this.hexToRgba(marker.color, 0.15) : '#ffffff80';

    const textbox = new Textbox(text, {
      left: marker.x,
      top: marker.y,
      width: marker.width || 120,
      fontSize: 12,
      fill: fillColor,
      backgroundColor: bgColor,
      stroke: fillColor,
      strokeWidth: 1,
    });

    textbox.set('data', { markerId: marker.id, markerType: marker.markerType });
    this.assignToActiveLayer(textbox);
    this.canvas.add(textbox);
    this.canvas.renderAll();
  }

  extractWorkMarkers(floorPlanId: string): IFloorPlanWorkMarker[] {
    if (!this.canvas) return [];

    return this.canvas.getObjects()
      .filter((obj) => {
        const data = (obj as any).data;
        return data !== undefined && 'markerId' in data;
      })
      .map((obj) => {
        const data = (obj as any).data;
        return {
          id: data.markerId || undefined,
          floorPlanId,
          x: obj.left ?? 0,
          y: obj.top ?? 0,
          width: obj.width ?? 120,
          height: obj.height ?? 50,
          color: (obj.fill as string) || '#000000',
          label: (obj as Textbox).text || '',
          markerType: data.markerType ?? FloorPlanMarkerType.Work,
        } as IFloorPlanWorkMarker;
      });
  }

  removeWorkMarkersFromCanvas(): void {
    if (!this.canvas) return;
    const markerObjects = this.canvas.getObjects().filter((obj) => {
      const data = (obj as any).data;
      return data !== undefined && 'markerId' in data;
    });
    markerObjects.forEach((obj) => this.canvas!.remove(obj));
    this.canvas.renderAll();
  }

  renderLiveMarkers(entries: { clientName: string; shiftName: string; startTime: string; endTime: string; color?: string }[]): void {
    if (!this.canvas) return;
    this.clearLiveMarkers();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const lines: string[] = [];
      if (entry.clientName) lines.push(entry.clientName);
      if (entry.shiftName) lines.push(entry.shiftName);
      if (entry.startTime || entry.endTime) {
        lines.push(`${entry.startTime} - ${entry.endTime}`);
      }

      const text = lines.join('\n');
      const fillColor = entry.color || '#2563eb';
      const bgColor = this.hexToRgba(fillColor, 0.15);

      const left = 50 + (i % 5) * 160;
      const top = 50 + Math.floor(i / 5) * 80;

      const textbox = new Textbox(text, {
        left,
        top,
        width: 140,
        fontSize: 11,
        fill: fillColor,
        backgroundColor: bgColor,
        stroke: fillColor,
        strokeWidth: 1,
      });

      textbox.set('data', { liveMarker: true, index: i });
      this.canvas.add(textbox);
    }

    this.canvas.renderAll();
  }

  clearLiveMarkers(): void {
    if (!this.canvas) return;
    const liveObjects = this.canvas.getObjects().filter((obj) => {
      const data = (obj as any).data;
      return data !== undefined && data.liveMarker === true;
    });
    liveObjects.forEach((obj) => this.canvas!.remove(obj));
    this.canvas.renderAll();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  startPolygonDrawing(): void {
    this.isPolygonDrawing = true;
    this.polygonPoints = [];
    this.tempPolyline = null;
  }

  isInPolygonDrawingMode(): boolean {
    return this.isPolygonDrawing;
  }

  addPolygonPoint(x: number, y: number): void {
    if (!this.canvas || !this.isPolygonDrawing) return;
    this.polygonPoints.push({ x: this.snap(x), y: this.snap(y) });
    this.refreshPolygonPreview();
  }

  updatePolygonPreview(x: number, y: number): void {
    if (!this.canvas || !this.isPolygonDrawing || this.polygonPoints.length === 0) return;
    this.refreshPolygonPreview(this.snap(x), this.snap(y));
  }

  private refreshPolygonPreview(mouseX?: number, mouseY?: number): void {
    if (!this.canvas) return;

    if (this.tempPolyline) {
      this.canvas.remove(this.tempPolyline);
    }

    const points = [...this.polygonPoints];
    if (mouseX !== undefined && mouseY !== undefined) {
      points.push({ x: mouseX, y: mouseY });
    }

    if (points.length >= 2) {
      this.tempPolyline = new Polyline(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      this.canvas.add(this.tempPolyline);
    }

    this.canvas.renderAll();
  }

  finishPolygonDrawing(): void {
    if (!this.canvas || !this.isPolygonDrawing || this.polygonPoints.length < 3) {
      this.cancelPolygonDrawing();
      return;
    }

    if (this.tempPolyline) {
      this.canvas.remove(this.tempPolyline);
    }

    this.addPolygon(this.polygonPoints);
    this.cancelPolygonDrawing();
  }

  cancelPolygonDrawing(): void {
    this.isPolygonDrawing = false;
    if (this.tempPolyline && this.canvas) {
      this.canvas.remove(this.tempPolyline);
    }
    this.tempPolyline = null;
    this.polygonPoints = [];
    this.canvas?.renderAll();
  }
}
