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
import { Line, ActiveSelection } from 'fabric';
import { FloorPlanToolService, FloorPlanTool, ConnectorType } from '../services/floor-plan-tool.service';
import { FloorPlanWorkDropService } from '../services/floor-plan-work-drop.service';
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
  private connectorStart: { x: number; y: number } | null = null;
  private tempConnectorLine: any = null;
  private isDeletingConnector = false;

  ngAfterViewInit(): void {
    this.canvasService.initCanvas(
      this.canvasRef.nativeElement,
      CANVAS_DEFAULT_WIDTH,
      CANVAS_DEFAULT_HEIGHT
    );
    this.layerService.initDefaultLayers();
    this.canvasService.syncLayerState();
    this.setupEffects();
    this.setupConnectorInteraction();
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

      const layerStateEffect = effect(() => {
        // React to any layer change (visibility, lock, order)
        this.layerService.layers();
        this.canvasService.syncLayerState();
      });
      this.effects.push(layerStateEffect);

      const activeLayerEffect = effect(() => {
        // Track active layer for visual feedback if needed
        this.layerService.activeLayerId();
      });
      this.effects.push(activeLayerEffect);

      const layerCleanupEffect = effect(() => {
        const layers = this.layerService.layers();
        const layerIds = new Set(layers.map((l) => l.id));
        const canvas = this.canvasService.getCanvas();
        if (!canvas) return;

        for (const obj of canvas.getObjects()) {
          const layerId = (obj as any).data?.layerId;
          if (layerId && !layerIds.has(layerId)) {
            const fallbackId = this.layerService.activeLayerId() || layers[0]?.id;
            if (fallbackId) {
              this.canvasService.setObjectLayer(obj, fallbackId);
            }
          }
        }
      });
      this.effects.push(layerCleanupEffect);
    });
  }

  private applyTool(tool: FloorPlanTool): void {
    this.canvasService.cancelPolygonDrawing();

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
      case FloorPlanTool.Arrow:
        this.canvasService.disableFreeDrawing();
        this.canvasService.addArrow();
        this.toolService.setTool(FloorPlanTool.Select);
        break;
      case FloorPlanTool.Polygon:
        this.canvasService.disableFreeDrawing();
        this.canvasService.startPolygonDrawing();
        this.setupPolygonEvents();
        break;
      case FloorPlanTool.Text:
        this.canvasService.disableFreeDrawing();
        this.canvasService.addText('Text');
        this.toolService.setTool(FloorPlanTool.Select);
        break;
      case FloorPlanTool.Connector:
        this.canvasService.disableFreeDrawing();
        this.setupConnectorEvents();
        break;
      default:
        this.canvasService.disableFreeDrawing();
        break;
    }
  }

  private setupPolygonEvents(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    canvas.on('mouse:down', this.onPolygonMouseDown);
    canvas.on('mouse:move', this.onPolygonMouseMove);
    canvas.on('mouse:dblclick', this.onPolygonDoubleClick);
  }

  private onPolygonMouseDown = (opt: any) => {
    if (!this.canvasService.isInPolygonDrawingMode()) return;
    const e = opt.e as MouseEvent;
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const pointer = canvas.getViewportPoint(e);
    this.canvasService.addPolygonPoint(pointer.x, pointer.y);
  };

  private onPolygonMouseMove = (opt: any) => {
    if (!this.canvasService.isInPolygonDrawingMode()) return;
    const e = opt.e as MouseEvent;
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const pointer = canvas.getViewportPoint(e);
    this.canvasService.updatePolygonPreview(pointer.x, pointer.y);
  };

  private onPolygonDoubleClick = () => {
    if (!this.canvasService.isInPolygonDrawingMode()) return;
    this.canvasService.finishPolygonDrawing();
    this.toolService.setTool(FloorPlanTool.Select);
    const canvas = this.canvasService.getCanvas();
    if (canvas) {
      canvas.off('mouse:down', this.onPolygonMouseDown);
      canvas.off('mouse:move', this.onPolygonMouseMove);
      canvas.off('mouse:dblclick', this.onPolygonDoubleClick);
    }
  };

  private setupConnectorEvents(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    this.connectorStart = null;
    canvas.on('mouse:down', this.onConnectorMouseDown);
    canvas.on('mouse:move', this.onConnectorMouseMove);
  }

  private setupConnectorInteraction(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    canvas.on('object:moving', (opt: any) => {
      const target = opt.target;
      if (!target) return;
      const data = (target as any).data;
      if (data?.isConnectorHandle) {
        this.canvasService.updateConnectorPath(data.connectorId);
      }
    });

    canvas.on('selection:created', (opt: any) => {
      this.expandConnectorSelection(opt.selected);
    });

    canvas.on('selection:updated', (opt: any) => {
      this.expandConnectorSelection(opt.selected);
    });

    canvas.on('object:removed', (opt: any) => {
      if (this.isDeletingConnector) return;
      const target = opt.target;
      if (!target) return;
      const data = (target as any).data;
      if (data?.isConnector) {
        this.isDeletingConnector = true;
        this.canvasService.deleteConnector(data.connectorId);
        this.isDeletingConnector = false;
      }
    });
  }

  private expandConnectorSelection(selected: any[]): void {
    if (!selected || selected.length !== 1) return;
    const data = (selected[0] as any).data;
    if (!data?.isConnector) return;

    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    const connectorId = data.connectorId;
    const related = canvas.getObjects().filter((obj: any) => obj.data?.connectorId === connectorId);
    if (related.length > 1) {
      const activeSelection = new ActiveSelection(related, { canvas });
      canvas.setActiveObject(activeSelection);
      canvas.renderAll();
    }
  }

  private teardownConnectorEvents(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    canvas.off('mouse:down', this.onConnectorMouseDown);
    canvas.off('mouse:move', this.onConnectorMouseMove);
    if (this.tempConnectorLine) {
      canvas.remove(this.tempConnectorLine);
      this.tempConnectorLine = null;
    }
    this.connectorStart = null;
  }

  private onConnectorMouseDown = (opt: any) => {
    if (this.toolService.activeTool() !== FloorPlanTool.Connector) return;
    const e = opt.e as MouseEvent;
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    // Don't start connector on top of existing objects (unless it's a handle)
    if (opt.target && !(opt.target as any).data?.isConnectorHandle) return;

    const pointer = canvas.getViewportPoint(e);

    if (!this.connectorStart) {
      this.connectorStart = { x: pointer.x, y: pointer.y };
    } else {
      const type = this.toolService.connectorType();
      this.canvasService.createConnector(this.connectorStart.x, this.connectorStart.y, pointer.x, pointer.y, type);
      this.teardownConnectorEvents();
      this.toolService.setTool(FloorPlanTool.Select);
    }
  };

  private onConnectorMouseMove = (opt: any) => {
    if (this.toolService.activeTool() !== FloorPlanTool.Connector || !this.connectorStart) return;
    const e = opt.e as MouseEvent;
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const pointer = canvas.getViewportPoint(e);

    if (this.tempConnectorLine) {
      canvas.remove(this.tempConnectorLine);
    }
    this.tempConnectorLine = new Line(
      [this.connectorStart.x, this.connectorStart.y, pointer.x, pointer.y],
      { stroke: '#2563eb', strokeWidth: 2, strokeDashArray: [5, 5] }
    );
    canvas.add(this.tempConnectorLine);
    canvas.renderAll();
  };

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
      const existingData = (obj as any).data ?? {};
      (obj as any).data = {
        ...existingData,
        markerId: marker.id || '',
        markerType: marker.shiftId ? 0 : 2, // Work = 0, Custom = 2
      };
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

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      if (event.shiftKey) {
        this.canvasService.ungroupSelected();
      } else {
        this.canvasService.groupSelected();
      }
    }

    if (event.key === 'Escape') {
      if (this.canvasService.isInPolygonDrawingMode()) {
        this.canvasService.cancelPolygonDrawing();
        this.toolService.setTool(FloorPlanTool.Select);
        const canvas = this.canvasService.getCanvas();
        if (canvas) {
          canvas.off('mouse:down', this.onPolygonMouseDown);
          canvas.off('mouse:move', this.onPolygonMouseMove);
          canvas.off('mouse:dblclick', this.onPolygonDoubleClick);
        }
      }
      if (this.toolService.activeTool() === FloorPlanTool.Connector) {
        this.teardownConnectorEvents();
        this.toolService.setTool(FloorPlanTool.Select);
      }
    }
  }
}
