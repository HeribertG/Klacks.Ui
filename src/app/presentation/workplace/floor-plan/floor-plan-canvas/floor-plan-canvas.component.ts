// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Canvas host component for the floor plan editor.
 * Initialises Fabric.js canvas, wires tool, layer, connector and merge services,
 * and handles keyboard shortcuts, drag-drop, and right-click context menu.
 */

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
import { Line, Rect, Circle, Polygon, Path } from 'fabric';
import { FloorPlanToolService, FloorPlanTool } from '../services/floor-plan-tool.service';
import { FloorPlanWorkDropService } from '../services/floor-plan-work-drop.service';
import { FloorPlanLayerService } from '../services/floor-plan-layer.service';
import { FloorPlanConnectorService } from '../services/floor-plan-connector.service';
import { FloorPlanMergeService } from '../services/floor-plan-merge.service';
import { FloorPlanJoinService } from '../services/floor-plan-join.service';
import { FloorPlanPointEditorService } from '../services/floor-plan-point-editor.service';
import { FloorPlanContextMenuComponent } from '../floor-plan-context-menu/floor-plan-context-menu.component';

const CANVAS_DEFAULT_WIDTH = 1200;
const CANVAS_DEFAULT_HEIGHT = 800;

@Component({
  selector: 'app-floor-plan-canvas',
  standalone: true,
  imports: [FloorPlanContextMenuComponent],
  templateUrl: './floor-plan-canvas.component.html',
  styleUrls: ['./floor-plan-canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;

  canvasService = inject(FloorPlanCanvasService);
  private toolService = inject(FloorPlanToolService);
  private workDropService = inject(FloorPlanWorkDropService);
  private layerService = inject(FloorPlanLayerService);
  private connectorService = inject(FloorPlanConnectorService);
  private injector = inject(Injector);

  private effects: EffectRef[] = [];
  private connectorStart: { shapeId?: string; portSide: 'left' | 'right' | 'top' | 'bottom' | 'free'; x: number; y: number } | null = null;
  private tempConnectorLine: any = null;
  private isDeletingConnector = false;
  private hoveredPortShapeId: string | null = null;
  private isRegularPolygonMode = false;

  @ViewChild('contextMenu') private contextMenu!: FloorPlanContextMenuComponent;
  private mergeService = inject(FloorPlanMergeService);
  private readonly joinService = inject(FloorPlanJoinService);
  private readonly pointEditorService = inject(FloorPlanPointEditorService);

  ngAfterViewInit(): void {
    this.canvasService.initCanvas(
      this.canvasRef.nativeElement,
      CANVAS_DEFAULT_WIDTH,
      CANVAS_DEFAULT_HEIGHT
    );
    this.layerService.initDefaultLayers();
    this.canvasService.syncLayerState();
    this.connectorService.init(this.canvasService.getCanvas()!);
    this.canvasService.registerAfterLoadCallback(() => this.connectorService.rebuildAfterLoad());
    this.mergeService.init(this.canvasService.getCanvas()!);
    this.joinService.init(this.canvasService.getCanvas()!);
    this.pointEditorService.init(this.canvasService.getCanvas()!);
    this.setupPointEditorEvents();
    this.setupEffects();
    this.setupConnectorInteraction();
    this.setupContextMenuInteraction();
  }

  ngOnDestroy(): void {
    this.canvasService.disposeCanvas();
    this.effects.forEach((e) => e?.destroy());
    this.effects = [];
  }

  private canEditPointsFromContext(): boolean {
    const obj = this.canvasService.selectedObject();
    if (!obj) return false;
    const d = (obj as any).data;
    if (!d) return false;
    if (d.isConnector || d.isPortIndicator || d.isPointHandle || d.isArrowhead || d.isMidpointHandle) return false;
    return obj instanceof Rect || obj instanceof Circle ||
           obj instanceof Polygon || obj instanceof Path || obj instanceof Line;
  }

  private canClosePathFromContext(): boolean {
    const obj = this.canvasService.selectedObject();
    if (!(obj instanceof Path)) return false;
    const cmds = (obj as any).path as any[][];
    return !cmds.some((cmd: any[]) => cmd[0] === 'Z');
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
    this.teardownConnectorEvents();
    this.teardownRegularPolygonEvents();
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
      case FloorPlanTool.Polygon:
        this.canvasService.disableFreeDrawing();
        this.canvasService.startPolygonDrawing();
        this.setupPolygonEvents();
        break;
      case FloorPlanTool.RegularPolygon:
        this.canvasService.disableFreeDrawing();
        this.setupRegularPolygonEvents();
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

  private setupRegularPolygonEvents(): void {
    this.isRegularPolygonMode = true;
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    canvas.on('mouse:down', this.onRegularPolygonMouseDown);
  }

  private teardownRegularPolygonEvents(): void {
    this.isRegularPolygonMode = false;
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    canvas.off('mouse:down', this.onRegularPolygonMouseDown);
  }

  private onRegularPolygonMouseDown = (opt: any) => {
    if (!this.isRegularPolygonMode) return;
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const e = opt.e as MouseEvent;
    const pointer = canvas.getViewportPoint(e);
    const sides = this.toolService.regularPolygonSides();
    this.canvasService.addRegularPolygonAt(sides, pointer.x, pointer.y);
    this.teardownRegularPolygonEvents();
    this.toolService.setTool(FloorPlanTool.Select);
  };

  private setupConnectorEvents(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    this.connectorStart = null;
    canvas.on('mouse:down', this.onConnectorMouseDown);
    canvas.on('mouse:move', this.onConnectorMouseMove);
    canvas.on('mouse:up', this.onConnectorMouseUp);
  }

  private setupContextMenuInteraction(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    canvas.on('contextmenu', (opt: any) => {
      const e = opt.e as MouseEvent;
      e.preventDefault();

      if (opt.target && !canvas.getActiveObject()) {
        canvas.setActiveObject(opt.target);
      }

      if (this.mergeService.canMerge() || this.joinService.canJoin() ||
          this.canEditPointsFromContext() || this.canClosePathFromContext()) {
        this.contextMenu.open(e.clientX, e.clientY);
      }
    });
  }

  private setupConnectorInteraction(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    canvas.on('mouse:down', (opt: any) => {
      if (this.pointEditorService.isInEditMode()) {
        const target = opt.target as any;
        const data = target?.data;
        if (!data?.isPointHandle && !data?.isPointStem) {
          this.pointEditorService.exitEditMode();
          return;
        }
      }

      if (this.toolService.activeTool() === FloorPlanTool.Connector) return;
      const target = opt.target;
      if (!target) {
        this.connectorService.deselectAll();
        return;
      }
      const data = (target as any).data;
      if (data?.isConnectorPath && data.connectorId) {
        if (this.connectorService.selectedConnectorId === data.connectorId) {
          this.connectorService.deselectAll();
        } else {
          this.connectorService.selectConnector(data.connectorId);
        }
        canvas.discardActiveObject();
        canvas.renderAll();
      } else if (data?.isEndpointHandle || data?.isMidpointHandle) {
        // Handle already belongs to selected connector — let Fabric handle the drag
      } else {
        this.connectorService.deselectAll();
      }
    });

    canvas.on('object:moving', (opt: any) => {
      const target = opt.target;
      if (!target) return;
      const data = (target as any).data;
      if (!data) return;

      if (data.isMidpointHandle && data.connectorId) {
        this.connectorService.onMidpointHandleMoved(
          data.connectorId,
          target.left ?? 0,
          target.top ?? 0
        );
      } else if (data.isEndpointHandle && data.connectorId) {
        this.connectorService.onEndpointHandleMoved(
          data.connectorId,
          data.isStart,
          target.left ?? 0,
          target.top ?? 0
        );
      } else if (data.isPointHandle) {
        this.pointEditorService.onHandleMoved(target);
      } else if (data.shapeId && !data.isConnector) {
        this.connectorService.onShapeMoved(data.shapeId);
      }
    });

    canvas.on('object:modified', (opt: any) => {
      const target = opt.target;
      const data = (target as any)?.data;
      if (!data) return;

      if (data.isEndpointHandle && data.connectorId) {
        const portHit = this.connectorService.getPortNear(target.left ?? 0, target.top ?? 0);
        const connectorId = data.connectorId;
        const isStart = data.isStart;
        const x = target.left ?? 0;
        const y = target.top ?? 0;
        setTimeout(() => {
          canvas.discardActiveObject();
          this.connectorService.onEndpointHandleReleased(connectorId, isStart, x, y, portHit);
        }, 0);
      } else if (data.isPointHandle) {
        this.pointEditorService.onHandleModified(target);
      } else if (data.shapeId && !data.isConnector) {
        this.connectorService.onShapeMoved(data.shapeId);
      }
    });

    canvas.on('object:removed', (opt: any) => {
      if (this.isDeletingConnector || this.connectorService.redrawing) return;
      if (this.pointEditorService.isConverting) return;
      const data = (opt.target as any)?.data;
      if (!data) return;
      if (data.isPortIndicator) return;
      if (data.isConnector && data.connectorId) {
        this.isDeletingConnector = true;
        this.connectorService.deleteConnector(data.connectorId);
        this.isDeletingConnector = false;
      } else if (data.shapeId && !data.isConnector) {
        this.connectorService.onShapeRemoved(data.shapeId);
      }
    });
  }

  private setupPointEditorEvents(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    canvas.on('mouse:dblclick', (opt: any) => {
      if (this.toolService.activeTool() === FloorPlanTool.Connector) return;
      if (this.pointEditorService.isInEditMode()) return;
      const target = opt.target as any;
      if (!target) return;
      const data = target.data;
      if (!data || data.isConnector || data.isPortIndicator || data.isPointHandle || data.isArrowhead) return;
      this.pointEditorService.enterEditMode(target);
    });
  }

  private teardownConnectorEvents(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    canvas.off('mouse:down', this.onConnectorMouseDown);
    canvas.off('mouse:move', this.onConnectorMouseMove);
    canvas.off('mouse:up', this.onConnectorMouseUp);
    if (this.tempConnectorLine) {
      canvas.remove(this.tempConnectorLine);
      this.tempConnectorLine = null;
    }
    this.connectorService.hidePortIndicators();
    this.connectorStart = null;
    this.hoveredPortShapeId = null;
  }

  private onConnectorMouseDown = (opt: any) => {
    if (this.toolService.activeTool() !== FloorPlanTool.Connector) return;
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const e = opt.e as MouseEvent;
    const pointer = canvas.getViewportPoint(e);
    const portHit = this.connectorService.getPortNear(pointer.x, pointer.y);

    this.connectorStart = portHit
      ? { shapeId: portHit.shapeId, portSide: portHit.portSide, x: portHit.x, y: portHit.y }
      : { portSide: 'free', x: pointer.x, y: pointer.y };

    this.connectorService.hidePortIndicators();
  };

  private onConnectorMouseMove = (opt: any) => {
    if (this.toolService.activeTool() !== FloorPlanTool.Connector) return;
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const e = opt.e as MouseEvent;
    const pointer = canvas.getViewportPoint(e);

    if (this.tempConnectorLine) {
      canvas.remove(this.tempConnectorLine);
      this.tempConnectorLine = null;
    }

    const portHit = this.connectorService.getPortNear(pointer.x, pointer.y);
    if (portHit) {
      if (this.hoveredPortShapeId !== portHit.shapeId) {
        this.hoveredPortShapeId = portHit.shapeId;
        this.connectorService.showPortIndicators(portHit.shapeId);
      }
    } else if (this.hoveredPortShapeId) {
      this.hoveredPortShapeId = null;
      this.connectorService.hidePortIndicators();
    }

    if (!this.connectorStart) return;

    this.tempConnectorLine = new Line(
      [this.connectorStart.x, this.connectorStart.y, pointer.x, pointer.y],
      { stroke: '#2563eb', strokeWidth: 2, strokeDashArray: [5, 5], selectable: false, evented: false }
    );
    canvas.add(this.tempConnectorLine);
    canvas.renderAll();
  };

  private onConnectorMouseUp = (opt: any) => {
    if (this.toolService.activeTool() !== FloorPlanTool.Connector) return;
    if (!this.connectorStart) return;
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    if (this.tempConnectorLine) {
      canvas.remove(this.tempConnectorLine);
      this.tempConnectorLine = null;
    }
    this.connectorService.hidePortIndicators();
    this.hoveredPortShapeId = null;

    const e = opt.e as MouseEvent;
    const pointer = canvas.getViewportPoint(e);
    const portHit = this.connectorService.getPortNear(pointer.x, pointer.y);

    if (portHit && portHit.shapeId === this.connectorStart.shapeId) {
      this.connectorStart = null;
      return;
    }

    const end = portHit
      ? { shapeId: portHit.shapeId, portSide: portHit.portSide, x: portHit.x, y: portHit.y }
      : { portSide: 'free' as const, x: pointer.x, y: pointer.y };

    this.connectorService.createConnector(
      this.connectorStart,
      end,
      this.toolService.connectorRouting(),
      this.toolService.connectorArrowhead()
    );

    this.connectorStart = null;
    this.teardownConnectorEvents();
    this.toolService.setTool(FloorPlanTool.Select);
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

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      this.canvasService.copySelected();
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
      event.preventDefault();
      void this.canvasService.paste();
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!isInputFocused) {
        if (this.pointEditorService.isInEditMode()) {
          this.pointEditorService.deleteSelectedNode();
        } else {
          this.canvasService.deleteSelected();
        }
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

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      if (this.canvasService.selectedObject()) {
        event.preventDefault();
        const step = this.toolService.snapEnabled() ? this.toolService.snapSize() : 1;
        const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
        const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
        if (event.shiftKey) {
          this.canvasService.resizeSelectedByDelta(dx, -dy);
        } else {
          this.canvasService.moveSelectedByDelta(dx, dy);
        }
      }
    }

    if (event.key === 'Escape') {
      if (this.pointEditorService.isInEditMode()) {
        this.pointEditorService.exitEditMode();
      }
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
