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
import { FabricObject } from 'fabric';
import { FloorPlanCanvasService } from '../services/floor-plan-canvas.service';

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

  private getCanvas() {
    return this.canvasService.getCanvas();
  }
}
