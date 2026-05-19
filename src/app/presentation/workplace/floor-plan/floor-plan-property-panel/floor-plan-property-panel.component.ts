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
import { FabricObject, Rect, Polygon, Polyline, Textbox } from 'fabric';
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
  isText: boolean;
  points: PointLike[];
  fontFamily: string;
  fontSize: number;
  fontBold: boolean;
  fontItalic: boolean;
  fontUnderline: boolean;
  fontLinethrough: boolean;
  textAlign: string;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  gradientEnabled: boolean;
  gradientColor1: string;
  gradientColor2: string;
  gradientDirection: string;
}

const FONT_FAMILIES = [
  'Arial',
  'Arial Black',
  'Comic Sans MS',
  'Courier New',
  'Georgia',
  'Impact',
  'Lucida Console',
  'Lucida Sans Unicode',
  'Palatino Linotype',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
];

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
  isText: false,
  points: [],
  fontFamily: 'Arial',
  fontSize: 20,
  fontBold: false,
  fontItalic: false,
  fontUnderline: false,
  fontLinethrough: false,
  textAlign: 'left',
  shadowEnabled: false,
  shadowColor: '#000000',
  shadowBlur: 10,
  shadowOffsetX: 5,
  shadowOffsetY: 5,
  gradientEnabled: false,
  gradientColor1: '#ffffff',
  gradientColor2: '#000000',
  gradientDirection: 'horizontal',
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
  readonly fontFamilies = FONT_FAMILIES;

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

      const positionEffect = effect(() => {
        this.canvasService.positionTick();
        const obj = this.canvasService.selectedObject();
        if (!obj) return;
        this.properties.update((p) => ({
          ...p,
          x: Math.round(obj.left ?? 0),
          y: Math.round(obj.top ?? 0),
        }));
      });
      this.effects.push(positionEffect);
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
    const isText = obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text';
    const points = isPolygon
      ? [...(obj as Polygon | Polyline).points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))]
      : [];

    let fontFamily = 'Arial';
    let fontSize = 20;
    let fontBold = false;
    let fontItalic = false;
    let fontUnderline = false;
    let fontLinethrough = false;
    let textAlign = 'left';
    if (isText) {
      const t = obj as Textbox;
      fontFamily = t.fontFamily ?? 'Arial';
      fontSize = t.fontSize ?? 20;
      fontBold = t.fontWeight === 'bold';
      fontItalic = t.fontStyle === 'italic';
      fontUnderline = !!(t as unknown as Record<string, unknown>)['underline'];
      fontLinethrough = !!(t as unknown as Record<string, unknown>)['linethrough'];
      textAlign = t.textAlign ?? 'left';
    }

    const shadow = obj.shadow as Record<string, unknown> | null | undefined;
    const shadowEnabled = shadow !== null && shadow !== undefined;
    const shadowColor = (shadow?.['color'] as string) ?? '#000000';
    const shadowBlur = (shadow?.['blur'] as number) ?? 10;
    const shadowOffsetX = (shadow?.['offsetX'] as number) ?? 5;
    const shadowOffsetY = (shadow?.['offsetY'] as number) ?? 5;

    const rawFill = obj.fill;
    const gradientEnabled = typeof rawFill === 'object' && rawFill !== null;
    let gradientColor1 = '#ffffff';
    let gradientColor2 = '#000000';
    let gradientDirection = 'horizontal';
    if (gradientEnabled) {
      const g = rawFill as unknown as Record<string, unknown>;
      const stops = (g['colorStops'] as { color: string }[]) ?? [];
      gradientColor1 = stops[0]?.color ?? '#ffffff';
      gradientColor2 = stops[stops.length - 1]?.color ?? '#000000';
      const coords = (g['coords'] as Record<string, number>) ?? {};
      if (g['type'] === 'radial') {
        gradientDirection = 'radial';
      } else if (Math.abs(coords['x1'] ?? 0) < 0.01 && Math.abs(coords['x2'] ?? 0) < 0.01) {
        gradientDirection = 'vertical';
      } else if (Math.abs(coords['x1'] ?? 0) > 0.01 && Math.abs(coords['y1'] ?? 0) > 0.01) {
        gradientDirection = (coords['y1'] ?? 0) < 0 ? 'diagonal-down' : 'diagonal-up';
      } else {
        gradientDirection = 'horizontal';
      }
    }

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
      isText,
      points,
      fontFamily,
      fontSize,
      fontBold,
      fontItalic,
      fontUnderline,
      fontLinethrough,
      textAlign,
      shadowEnabled,
      shadowColor,
      shadowBlur,
      shadowOffsetX,
      shadowOffsetY,
      gradientEnabled,
      gradientColor1,
      gradientColor2,
      gradientDirection,
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

  onFontFamilyChange(value: string): void {
    this.canvasService.applyFontFamily(value);
    this.properties.update((p) => ({ ...p, fontFamily: value }));
  }

  onFontSizeChange(value: number): void {
    const size = Math.max(1, value);
    this.canvasService.applyFontSize(size);
    this.properties.update((p) => ({ ...p, fontSize: size }));
  }

  onBoldToggle(): void {
    const newVal = !this.properties().fontBold;
    this.canvasService.applyBold(newVal);
    this.properties.update((p) => ({ ...p, fontBold: newVal }));
  }

  onItalicToggle(): void {
    const newVal = !this.properties().fontItalic;
    this.canvasService.applyItalic(newVal);
    this.properties.update((p) => ({ ...p, fontItalic: newVal }));
  }

  onUnderlineToggle(): void {
    const newVal = !this.properties().fontUnderline;
    this.canvasService.applyUnderline(newVal);
    this.properties.update((p) => ({ ...p, fontUnderline: newVal }));
  }

  onLinethroughToggle(): void {
    const newVal = !this.properties().fontLinethrough;
    this.canvasService.applyLinethrough(newVal);
    this.properties.update((p) => ({ ...p, fontLinethrough: newVal }));
  }

  onTextAlignChange(align: string): void {
    this.canvasService.applyTextAlign(align);
    this.properties.update((p) => ({ ...p, textAlign: align }));
  }

  onTextColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.canvasService.applyTextColor(input.value);
    this.properties.update((p) => ({ ...p, fill: input.value }));
  }

  onShadowEnabledChange(enabled: boolean): void {
    const p = this.properties();
    this.canvasService.applyObjectShadow(enabled, p.shadowColor, p.shadowBlur, p.shadowOffsetX, p.shadowOffsetY);
    this.properties.update((prev) => ({ ...prev, shadowEnabled: enabled }));
  }

  onShadowColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const p = this.properties();
    if (!p.shadowEnabled) return;
    this.canvasService.applyObjectShadow(true, input.value, p.shadowBlur, p.shadowOffsetX, p.shadowOffsetY);
    this.properties.update((prev) => ({ ...prev, shadowColor: input.value }));
  }

  onShadowBlurChange(value: number): void {
    const p = this.properties();
    if (!p.shadowEnabled) return;
    const blur = Math.max(0, value);
    this.canvasService.applyObjectShadow(true, p.shadowColor, blur, p.shadowOffsetX, p.shadowOffsetY);
    this.properties.update((prev) => ({ ...prev, shadowBlur: blur }));
  }

  onShadowOffsetXChange(value: number): void {
    const p = this.properties();
    if (!p.shadowEnabled) return;
    this.canvasService.applyObjectShadow(true, p.shadowColor, p.shadowBlur, value, p.shadowOffsetY);
    this.properties.update((prev) => ({ ...prev, shadowOffsetX: value }));
  }

  onShadowOffsetYChange(value: number): void {
    const p = this.properties();
    if (!p.shadowEnabled) return;
    this.canvasService.applyObjectShadow(true, p.shadowColor, p.shadowBlur, p.shadowOffsetX, value);
    this.properties.update((prev) => ({ ...prev, shadowOffsetY: value }));
  }

  onGradientEnabledChange(enabled: boolean): void {
    const p = this.properties();
    this.canvasService.applyGradientFill(enabled, p.gradientColor1, p.gradientColor2, p.gradientDirection);
    this.properties.update((prev) => ({ ...prev, gradientEnabled: enabled }));
  }

  onGradientColor1Change(event: Event): void {
    const input = event.target as HTMLInputElement;
    const p = this.properties();
    this.canvasService.applyGradientFill(p.gradientEnabled, input.value, p.gradientColor2, p.gradientDirection);
    this.properties.update((prev) => ({ ...prev, gradientColor1: input.value }));
  }

  onGradientColor2Change(event: Event): void {
    const input = event.target as HTMLInputElement;
    const p = this.properties();
    this.canvasService.applyGradientFill(p.gradientEnabled, p.gradientColor1, input.value, p.gradientDirection);
    this.properties.update((prev) => ({ ...prev, gradientColor2: input.value }));
  }

  onGradientDirectionChange(direction: string): void {
    const p = this.properties();
    this.canvasService.applyGradientFill(p.gradientEnabled, p.gradientColor1, p.gradientColor2, direction);
    this.properties.update((prev) => ({ ...prev, gradientDirection: direction }));
  }

  private getCanvas() {
    return this.canvasService.getCanvas();
  }
}
