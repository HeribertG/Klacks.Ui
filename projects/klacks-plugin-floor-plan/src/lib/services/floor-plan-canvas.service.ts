// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Owns the Fabric.js canvas of the floor plan editor: lifecycle, selection and canvas events,
 * read-only and layer state, zoom and pan, undo/redo history and serialization.
 * @param canvasElement - HTML canvas element the Fabric.js canvas is created on (initCanvas)
 * @param layerService - Source of the active layer and of layer visibility/lock state
 * @param toolService - Grid snapping settings applied while objects are moved
 * @param anchorSnapService - Anchor snapping and its highlight while objects are moved
 */

import { Injectable, signal, computed, Signal, inject } from '@angular/core';
import { Canvas, FabricObject, Point } from 'fabric';
import { FloorPlanLayerService } from './floor-plan-layer.service';
import { FloorPlanToolService } from './floor-plan-tool.service';
import { FloorPlanAnchorSnapService } from './floor-plan-anchor-snap.service';
import { FabricWithData } from './fabric-with-data.type';

FabricObject.customProperties.push('data');

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
  private anchorSnapService = inject(FloorPlanAnchorSnapService);

  private readonly _zoom = signal(1);
  private readonly _selectedObject = signal<FabricObject | null>(null);
  private readonly _isPanning = signal(false);
  private readonly _canvasReady = signal(false);
  private readonly _undoStack = signal<string[]>([]);
  private readonly _redoStack = signal<string[]>([]);
  private readonly _positionTick = signal(0);

  readonly zoom: Signal<number> = this._zoom.asReadonly();
  readonly selectedObject: Signal<FabricObject | null> = this._selectedObject.asReadonly();
  readonly isPanning: Signal<boolean> = this._isPanning.asReadonly();
  readonly canvasReady: Signal<boolean> = this._canvasReady.asReadonly();
  readonly canUndo: Signal<boolean> = computed(() => this._undoStack().length > 0);
  readonly canRedo: Signal<boolean> = computed(() => this._redoStack().length > 0);
  readonly positionTick: Signal<number> = this._positionTick.asReadonly();

  private isPanningActive = false;
  private lastPanPoint: Point | null = null;
  private afterLoadCallback: (() => void) | null = null;
  private _suppressHistory = false;
  private _readOnly = false;

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

  beginSuppressHistory(): void {
    this._suppressHistory = true;
  }

  endSuppressHistory(): void {
    this._suppressHistory = false;
  }

  captureHistory(): void {
    this._suppressHistory = false;
    this.saveHistory();
  }

  assignToActiveLayer(obj: FabricObject): void {
    const activeLayerId = this.layerService.activeLayerId();
    if (!activeLayerId) return;
    const existingData = (obj as FabricWithData).data ?? {};
    obj.set('data', { ...existingData, layerId: activeLayerId });
  }

  notifyPositionChanged(): void {
    this._positionTick.update((v) => v + 1);
  }

  syncLayerState(): void {
    if (!this.canvas) return;
    const layers = this.layerService.layers();
    const layerMap = new Map(layers.map((l) => [l.id, l]));

    for (const obj of this.canvas.getObjects()) {
      const data = (obj as FabricWithData).data;
      const layerId = data?.layerId;
      if (!layerId) continue;

      const layer = layerMap.get(layerId);
      if (!layer) continue;

      const isVisible = layer.visible;
      const isLocked = layer.locked || this._readOnly;

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

  setReadOnly(readOnly: boolean): void {
    this._readOnly = readOnly;
    if (!this.canvas) return;

    this.canvas.selection = !readOnly;
    this.canvas.isDrawingMode = false;
    this.canvas.skipTargetFind = readOnly;

    for (const obj of this.canvas.getObjects()) {
      obj.set({
        selectable: !readOnly,
        evented: !readOnly,
        lockMovementX: readOnly,
        lockMovementY: readOnly,
        lockRotation: readOnly,
        lockScalingX: readOnly,
        lockScalingY: readOnly,
      });
    }

    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  isReadOnly(): boolean {
    return this._readOnly;
  }

  setObjectLayer(obj: FabricObject, layerId: string): void {
    const existingData = (obj as FabricWithData).data ?? {};
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

    this.canvas.on('object:modified', (e) => {
      this.anchorSnapService.hideHighlight(this.canvas!);
      if ((e.target as FabricWithData)?.data?.isConnector) return;
      if ((e.target as FabricWithData)?.data?.isPointHandle) return;
      if ((e.target as FabricWithData)?.data?.isPointStem) return;
      this.saveHistory();
    });

    this.canvas.on('object:added', (e) => {
      if ((e.target as FabricWithData)?.data?.isPortIndicator) return;
      if ((e.target as FabricWithData)?.data?.isConnector) return;
      if ((e.target as FabricWithData)?.data?.isPointHandle) return;
      if ((e.target as FabricWithData)?.data?.isPointStem) return;
      this.saveHistory();
    });

    this.canvas.on('object:removed', (e) => {
      if ((e.target as FabricWithData)?.data?.isPortIndicator) return;
      if ((e.target as FabricWithData)?.data?.isConnector) return;
      if ((e.target as FabricWithData)?.data?.isPointHandle) return;
      if ((e.target as FabricWithData)?.data?.isPointStem) return;
      this.saveHistory();
    });

    this.canvas.on('path:created', (opt) => {
      const path = opt.path;
      if (path) {
        path.set('data', { shapeId: crypto.randomUUID() });
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
      const obj = opt.target;
      if (!obj) return;
      if ((obj as FabricWithData).data?.isPointHandle) return;

      const snap = this.anchorSnapService.findSnap(obj, this.canvas!);
      if (snap) {
        obj.set({
          left: (obj.left ?? 0) + snap.offsetX,
          top: (obj.top ?? 0) + snap.offsetY,
        });
        this.anchorSnapService.showHighlight(this.canvas!, snap.targetPoint);
      } else {
        this.anchorSnapService.hideHighlight(this.canvas!);
        if (this.toolService.snapEnabled()) {
          const size = Number(this.toolService.snapSize());
          if (size > 0) {
            obj.set({
              left: Math.round((obj.left ?? 0) / size) * size,
              top: Math.round((obj.top ?? 0) / size) * size,
            });
          }
        }
      }

      this._positionTick.update((v) => v + 1);
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

  toJSON(): string {
    if (!this.canvas) return '{}';
    return JSON.stringify(this.canvas.toObject());
  }

  async loadFromJSON(json: string): Promise<void> {
    if (!this.canvas) return;
    await this.canvas.loadFromJSON(JSON.parse(json));
    this.assignMissingShapeIds();
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

  saveHistory(): void {
    if (!this.canvas || this._suppressHistory) return;
    const state = JSON.stringify(this.canvas.toObject());
    this._undoStack.update((stack) => {
      const updated = [...stack, state];
      return updated.length > HISTORY_MAX ? updated.slice(updated.length - HISTORY_MAX) : updated;
    });
    this._redoStack.set([]);
  }

  private restoreState(json: string): void {
    if (!this.canvas) return;
    this.canvas.loadFromJSON(JSON.parse(json)).then(() => {
      this.assignMissingShapeIds();
      this.canvas!.renderAll();
      this.afterLoadCallback?.();
    });
  }

  getCanvas(): Canvas | null {
    return this.canvas;
  }

  registerAfterLoadCallback(callback: () => void): void {
    this.afterLoadCallback = callback;
  }

  private assignMissingShapeIds(): void {
    if (!this.canvas) return;
    for (const obj of this.canvas.getObjects()) {
      const data = (obj as FabricWithData).data ?? {};
      const isShape = !data.isConnector && !data.markerId && !data.liveMarker;
      if (isShape && !data.shapeId) {
        obj.set('data', { ...data, shapeId: crypto.randomUUID() });
      }
    }
  }
}
