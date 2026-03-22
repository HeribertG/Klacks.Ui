// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  HostListener,
  effect,
  Injector,
  runInInjectionContext,
  EffectRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FloorPlanCanvasService } from '../services/floor-plan-canvas.service';
import { FloorPlanToolService, FloorPlanTool } from '../services/floor-plan-tool.service';
import { FloorPlanWorkDropService, FloorPlanDragData } from '../services/floor-plan-work-drop.service';
import { FloorPlanLayerService } from '../services/floor-plan-layer.service';

const CANVAS_DEFAULT_WIDTH = 1200;
const CANVAS_DEFAULT_HEIGHT = 800;

@Component({
  selector: 'app-floor-plan-canvas',
  standalone: true,
  imports: [],
  template: `<canvas #canvasRef></canvas>`,
  styleUrls: ['./floor-plan-canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;

  private canvasService = inject(FloorPlanCanvasService);
  private toolService = inject(FloorPlanToolService);
  private workDropService = inject(FloorPlanWorkDropService);
  private layerService = inject(FloorPlanLayerService);
  private injector = inject(Injector);

  private effects: EffectRef[] = [];

  ngAfterViewInit(): void {
    this.canvasService.initCanvas(
      this.canvasRef.nativeElement,
      CANVAS_DEFAULT_WIDTH,
      CANVAS_DEFAULT_HEIGHT
    );
    this.layerService.initDefaultLayers();
    this.setupEffects();
  }

  ngOnDestroy(): void {
    this.canvasService.disposeCanvas();
    this.effects.forEach((e) => e?.destroy());
    this.effects = [];
  }

  private setupEffects(): void {
    runInInjectionContext(this.injector, () => {
      const toolEffect = effect(() => {
        const tool = this.toolService.activeTool();
        this.applyTool(tool);
      });
      this.effects.push(toolEffect);

      const strokeEffect = effect(() => {
        this.canvasService.applyStrokeColor(this.toolService.strokeColor());
      });
      this.effects.push(strokeEffect);

      const strokeWidthEffect = effect(() => {
        this.canvasService.applyStrokeWidth(this.toolService.strokeWidth());
      });
      this.effects.push(strokeWidthEffect);
    });
  }

  private applyTool(tool: FloorPlanTool): void {
    switch (tool) {
      case FloorPlanTool.FreeDrawing:
        this.canvasService.enableFreeDrawing();
        break;
      case FloorPlanTool.Rectangle:
        this.canvasService.disableFreeDrawing();
        this.canvasService.addRect();
        this.toolService.setTool(FloorPlanTool.Select);
        break;
      case FloorPlanTool.Circle:
        this.canvasService.disableFreeDrawing();
        this.canvasService.addCircle();
        this.toolService.setTool(FloorPlanTool.Select);
        break;
      case FloorPlanTool.Line:
        this.canvasService.disableFreeDrawing();
        this.canvasService.addLine();
        this.toolService.setTool(FloorPlanTool.Select);
        break;
      case FloorPlanTool.Text:
        this.canvasService.disableFreeDrawing();
        this.canvasService.addText('Text');
        this.toolService.setTool(FloorPlanTool.Select);
        break;
      default:
        this.canvasService.disableFreeDrawing();
        break;
    }
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (!this.workDropService.isDragging()) return;

    const position = this.workDropService.updatePosition(
      event as MouseEvent,
      this.canvasRef.nativeElement
    );

    const marker = this.workDropService.endDrag();
    if (!marker) return;

    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    const vpt = canvas.viewportTransform;
    const canvasX = (position.x - (vpt ? vpt[4] : 0)) / canvas.getZoom();
    const canvasY = (position.y - (vpt ? vpt[5] : 0)) / canvas.getZoom();

    this.canvasService.addText(marker.clientName ?? marker.label ?? 'Work');
    const obj = canvas.getObjects().at(-1);
    if (obj) {
      obj.set({ left: canvasX, top: canvasY });
      canvas.renderAll();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const isInputFocused =
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement;
    if (isInputFocused) return;

    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.canvasService.redo();
      } else {
        this.canvasService.undo();
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
      event.preventDefault();
      this.canvasService.redo();
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!isInputFocused) {
        this.canvasService.deleteSelected();
      }
    }
  }
}
