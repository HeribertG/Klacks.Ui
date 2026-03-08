// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal, computed, Signal } from '@angular/core';
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
} from 'fabric';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 10;
const ZOOM_STEP = 0.1;
const ZOOM_WHEEL_FACTOR = 0.999;
const HISTORY_MAX = 50;

@Injectable()
export class FloorPlanCanvasService {
  private canvas: Canvas | null = null;

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
      left: 100,
      top: 100,
      width: 120,
      height: 80,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    this.canvas.add(rect);
    this.canvas.setActiveObject(rect);
    this.canvas.renderAll();
  }

  addCircle(): void {
    if (!this.canvas) return;
    const circle = new Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    this.canvas.add(circle);
    this.canvas.setActiveObject(circle);
    this.canvas.renderAll();
  }

  addLine(): void {
    if (!this.canvas) return;
    const line = new Line([50, 50, 200, 50], {
      stroke: '#000000',
      strokeWidth: 2,
    });
    this.canvas.add(line);
    this.canvas.setActiveObject(line);
    this.canvas.renderAll();
  }

  addText(text: string): void {
    if (!this.canvas) return;
    const textbox = new Textbox(text, {
      left: 100,
      top: 100,
      fontSize: 16,
      fill: '#000000',
      width: 200,
    });
    this.canvas.add(textbox);
    this.canvas.setActiveObject(textbox);
    this.canvas.renderAll();
  }

  addPolygon(points: { x: number; y: number }[]): void {
    if (!this.canvas) return;
    const polygon = new Polygon(points, {
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
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
      if (obj) this.canvas!.add(obj);
    });
    if (options['width'] && options['height']) {
      this.canvas.setDimensions({ width: options['width'] as number, height: options['height'] as number });
    }
    this.canvas.renderAll();
  }

  toDataURL(): string {
    if (!this.canvas) return '';
    return this.canvas.toDataURL({ format: 'png', multiplier: 1 });
  }

  async addImage(url: string): Promise<void> {
    if (!this.canvas) return;
    const img = await FabricImage.fromURL(url);
    img.set({ left: 100, top: 100 });
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
}
