// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  inject,
  computed,
  effect,
  Injector,
  runInInjectionContext,
  EffectRef,
  OnInit,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FabricObject, Rect, Polygon, Polyline } from 'fabric';
import { FloorPlanCanvasService } from '../services/floor-plan-canvas.service';

interface PointLike {
  x: number;
  y: number;
}

interface ObjectProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  stroke: string;
  fill: string;
  strokeWidth: number;
  rx: number;
  ry: number;
  locked: boolean;
  isRect: boolean;
  isPolygon: boolean;
  points: PointLike[];
}

const DEFAULT_PROPERTIES: ObjectProperties = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  angle: 0,
  opacity: 1,
  stroke: '#000000',
  fill: '#ffffff',
  strokeWidth: 1,
  rx: 0,
  ry: 0,
  locked: false,
  isRect: false,
  isPolygon: false,
  points: [],
};

@Component({
  selector: 'app-floor-plan-property-panel',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './floor-plan-property-panel.component.html',
  styleUrls: ['./floor-plan-property-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanPropertyPanelComponent implements OnInit, OnDestroy {
  canvasService = inject(FloorPlanCanvasService);
  private injector = inject(Injector);

  readonly properties = signal<ObjectProperties>({ ...DEFAULT_PROPERTIES });
  readonly hasSelection = computed(() => this.canvasService.selectedObject() !== null);
  readonly selectedType = computed(() => this.canvasService.selectedObject()?.type);

  private effects: EffectRef[] = [];

  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      const selectionEffect = effect(() => {
        const obj = this.canvasService.selectedObject();
        this.readObjectProperties(obj);
      });
      this.effects.push(selectionEffect);
    });
  }

  ngOnDestroy(): void {
    this.effects.forEach((e) => e?.destroy());
    this.effects = [];
  }

  private readObjectProperties(obj: FabricObject | null): void {
    if (!obj) {
      this.properties.set({ ...DEFAULT_PROPERTIES });
      return;
    }

    const bounds = obj.getBoundingRect();
    const isRect = obj.type === 'rect';
    const isPolygon = obj.type === 'polygon' || obj.type === 'polyline';
    const points = isPolygon
      ? [...(obj as Polygon | Polyline).points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))]
      : [];

    this.properties.set({
      x: Math.round(obj.left ?? 0),
      y: Math.round(obj.top ?? 0),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
      angle: Math.round(obj.angle ?? 0),
      opacity: obj.opacity ?? 1,
      stroke: (obj.stroke as string) ?? '#000000',
      fill: this.normalizeFill(obj.fill),
      strokeWidth: obj.strokeWidth ?? 1,
      rx: isRect ? Math.round((obj as Rect).rx ?? 0) : 0,
      ry: isRect ? Math.round((obj as Rect).ry ?? 0) : 0,
      locked: !obj.hasControls,
      isRect,
      isPolygon,
      points,
    });
  }

  private normalizeFill(fill: unknown): string {
    if (!fill || fill === 'transparent' || fill === '') return '#ffffff';
    if (typeof fill === 'string') return fill;
    return '#ffffff';
  }

  onXChange(value: number): void {
    const obj = this.canvasService.selectedObject();
    if (!obj) return;
    obj.set('left', value);
    this.getCanvas()?.renderAll();
  }

  onYChange(value: number): void {
    const obj = this.canvasService.selectedObject();
    if (!obj) return;
    obj.set('top', value);
    this.getCanvas()?.renderAll();
  }

  onAngleChange(value: number): void {
    const obj = this.canvasService.selectedObject();
    if (!obj) return;
    obj.set('angle', value);
    this.getCanvas()?.renderAll();
  }

  onOpacityChange(value: number): void {
    const obj = this.canvasService.selectedObject();
    if (!obj) return;
    const clamped = Math.max(0, Math.min(1, value));
    obj.set('opacity', clamped);
    this.properties.update((p) => ({ ...p, opacity: clamped }));
    this.getCanvas()?.renderAll();
  }

  onStrokeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.canvasService.applyStrokeColor(input.value);
    this.properties.update((p) => ({ ...p, stroke: input.value }));
  }

  onFillChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.canvasService.applyFillColor(input.value);
    this.properties.update((p) => ({ ...p, fill: input.value }));
  }

  onStrokeWidthChange(value: number): void {
    this.canvasService.applyStrokeWidth(value);
    this.properties.update((p) => ({ ...p, strokeWidth: value }));
  }

  onBringToFront(): void {
    this.canvasService.bringToFront();
  }

  onSendToBack(): void {
    this.canvasService.sendToBack();
  }

  onDelete(): void {
    this.canvasService.deleteSelected();
  }

  onLockToggle(): void {
    const obj = this.canvasService.selectedObject();
    if (!obj) return;
    const newLocked = !this.properties().locked;
    obj.set({
      hasControls: !newLocked,
      hasBorders: !newLocked,
      lockMovementX: newLocked,
      lockMovementY: newLocked,
      lockRotation: newLocked,
      lockScalingX: newLocked,
      lockScalingY: newLocked,
    });
    this.properties.update((p) => ({ ...p, locked: newLocked }));
    this.getCanvas()?.renderAll();
  }

  onRxChange(value: number): void {
    const obj = this.canvasService.selectedObject();
    if (!obj || obj.type !== 'rect') return;
    (obj as Rect).set('rx', Math.max(0, value));
    this.properties.update((p) => ({ ...p, rx: value }));
    this.getCanvas()?.renderAll();
  }

  onRyChange(value: number): void {
    const obj = this.canvasService.selectedObject();
    if (!obj || obj.type !== 'rect') return;
    (obj as Rect).set('ry', Math.max(0, value));
    this.properties.update((p) => ({ ...p, ry: value }));
    this.getCanvas()?.renderAll();
  }

  onDeletePoint(index: number): void {
    const obj = this.canvasService.selectedObject();
    if (!obj || (obj.type !== 'polygon' && obj.type !== 'polyline')) return;

    const poly = obj as Polygon | Polyline;
    const currentPoints = poly.points;
    if (currentPoints.length <= 3) return;

    const newPoints = currentPoints.filter((_, i) => i !== index);
    poly.set('points', newPoints);
    this.properties.update((p) => ({
      ...p,
      points: newPoints.map((pt) => ({ x: Math.round(pt.x), y: Math.round(pt.y) })),
    }));
    this.getCanvas()?.renderAll();
  }

  onAddPoint(): void {
    const obj = this.canvasService.selectedObject();
    if (!obj || (obj.type !== 'polygon' && obj.type !== 'polyline')) return;

    const poly = obj as Polygon | Polyline;
    const currentPoints = poly.points;
    const last = currentPoints[currentPoints.length - 1];
    const beforeLast = currentPoints[currentPoints.length - 2];
    const dx = last.x - (beforeLast?.x ?? 0);
    const dy = last.y - (beforeLast?.y ?? 0);

    const newPoints = [
      ...currentPoints,
      { x: last.x + dx, y: last.y + dy },
    ];
    poly.set('points', newPoints);
    this.properties.update((p) => ({
      ...p,
      points: newPoints.map((pt) => ({ x: Math.round(pt.x), y: Math.round(pt.y) })),
    }));
    this.getCanvas()?.renderAll();
  }

  onPointXChange(index: number, value: number): void {
    const obj = this.canvasService.selectedObject();
    if (!obj || (obj.type !== 'polygon' && obj.type !== 'polyline')) return;

    const poly = obj as Polygon | Polyline;
    const newPoints = poly.points.map((p, i) => (i === index ? { x: value, y: p.y } : p));
    poly.set('points', newPoints);
    this.properties.update((p) => ({
      ...p,
      points: newPoints.map((pt) => ({ x: Math.round(pt.x), y: Math.round(pt.y) })),
    }));
    this.getCanvas()?.renderAll();
  }

  onPointYChange(index: number, value: number): void {
    const obj = this.canvasService.selectedObject();
    if (!obj || (obj.type !== 'polygon' && obj.type !== 'polyline')) return;

    const poly = obj as Polygon | Polyline;
    const newPoints = poly.points.map((p, i) => (i === index ? { x: p.x, y: value } : p));
    poly.set('points', newPoints);
    this.properties.update((p) => ({
      ...p,
      points: newPoints.map((pt) => ({ x: Math.round(pt.x), y: Math.round(pt.y) })),
    }));
    this.getCanvas()?.renderAll();
  }

  private getCanvas() {
    return this.canvasService.getCanvas();
  }
}
