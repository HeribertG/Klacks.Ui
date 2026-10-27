// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Toolbar for the floor plan editor providing tool selection, connector options, colors, zoom and undo/redo.
 */

import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  HostListener,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FloorPlanCanvasService } from '../services/floor-plan-canvas.service';
import { FloorPlanObjectEditService } from '../services/floor-plan-object-edit.service';
import { FloorPlanShapeService } from '../services/floor-plan-shape.service';
import { FloorPlanObjectStyleService } from '../services/floor-plan-object-style.service';
import {
  FloorPlanToolService,
  MIN_REGULAR_POLYGON_SIDES,
  MAX_REGULAR_POLYGON_SIDES,
} from '../services/floor-plan-tool.service';
import { FloorPlanTool } from '../services/floor-plan-tool.enum';
import { ConnectorRoutingType } from '../services/connector-routing-type.enum';
import { ConnectorArrowheadType } from '../services/connector-arrowhead-type.enum';
import { FloorPlanExportService } from '../services/floor-plan-export.service';
import { FloorPlanImportService } from '../services/floor-plan-import.service';
import { FloorPlanMergeService } from '../services/floor-plan-merge.service';
import { FloorPlanJoinService } from '../services/floor-plan-join.service';
import { FloorPlanConnectorService } from '../services/floor-plan-connector.service';
import { FabricWithData } from '../services/fabric-with-data.type';
import { IconFpSelectComponent } from '../shared/icons/icon-fp-select.component';
import { IconFpLineComponent } from '../shared/icons/icon-fp-line.component';
import { IconFpRectangleComponent } from '../shared/icons/icon-fp-rectangle.component';
import { IconFpCircleComponent } from '../shared/icons/icon-fp-circle.component';
import { IconFpPolygonComponent } from '../shared/icons/icon-fp-polygon.component';
import { IconFpPencilComponent } from '../shared/icons/icon-fp-pencil.component';
import { IconFpTextComponent } from '../shared/icons/icon-fp-text.component';
import { IconFpEraserComponent } from '../shared/icons/icon-fp-eraser.component';
import { IconFpUndoComponent } from '../shared/icons/icon-fp-undo.component';
import { IconFpRedoComponent } from '../shared/icons/icon-fp-redo.component';
import { IconFpZoomPlusComponent } from '../shared/icons/icon-fp-zoom-plus.component';
import { IconFpZoomMinusComponent } from '../shared/icons/icon-fp-zoom-minus.component';
import { PluginIconFpImportComponent } from '../shared/icons/icon-fp-import.component';
import { IconFpExportComponent } from '../shared/icons/icon-fp-export.component';

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8, 12, 16];

@Component({
  selector: 'lib-floor-plan-toolbar',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    IconFpSelectComponent,
    IconFpLineComponent,
    IconFpRectangleComponent,
    IconFpCircleComponent,
    IconFpPolygonComponent,
    IconFpPencilComponent,
    IconFpTextComponent,
    IconFpEraserComponent,
    IconFpUndoComponent,
    IconFpRedoComponent,
    IconFpZoomPlusComponent,
    IconFpZoomMinusComponent,
    PluginIconFpImportComponent,
    IconFpExportComponent,
  ],
  templateUrl: './floor-plan-toolbar.component.html',
  styleUrls: ['./floor-plan-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanToolbarComponent {
  @ViewChild('importFileRef') importFileRef!: ElementRef<HTMLInputElement>;

  readonly showExportMenu = signal(false);

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showExportMenu.set(false);
  }

  toggleExportMenu(event: Event): void {
    event.stopPropagation();
    this.showExportMenu.update(v => !v);
  }

  canvasService = inject(FloorPlanCanvasService);
  readonly editService = inject(FloorPlanObjectEditService);
  private readonly shapeService = inject(FloorPlanShapeService);
  private readonly styleService = inject(FloorPlanObjectStyleService);
  toolService = inject(FloorPlanToolService);
  private exportService = inject(FloorPlanExportService);
  private importService = inject(FloorPlanImportService);
  readonly mergeService = inject(FloorPlanMergeService);
  readonly joinService = inject(FloorPlanJoinService);
  private readonly connectorService = inject(FloorPlanConnectorService);

  readonly FloorPlanTool = FloorPlanTool;
  readonly ConnectorRoutingType = ConnectorRoutingType;
  readonly ConnectorArrowheadType = ConnectorArrowheadType;
  readonly strokeWidths = STROKE_WIDTHS;
  readonly snapSizes = [5, 10, 20, 50, 100];
  readonly regularPolygonSideOptions = Array.from(
    { length: MAX_REGULAR_POLYGON_SIDES - MIN_REGULAR_POLYGON_SIDES + 1 },
    (_, i) => i + MIN_REGULAR_POLYGON_SIDES
  );

  isToolActive(tool: FloorPlanTool): boolean {
    return this.toolService.activeTool() === tool;
  }

  onSelectTool(tool: FloorPlanTool): void {
    this.toolService.setTool(tool);
  }

  onRoutingChange(routing: ConnectorRoutingType): void {
    this.toolService.setConnectorRouting(routing);
  }

  onArrowheadChange(arrowhead: ConnectorArrowheadType): void {
    this.toolService.setConnectorArrowhead(arrowhead);
  }

  onZoomIn(): void { this.canvasService.zoomIn(); }
  onZoomOut(): void { this.canvasService.zoomOut(); }
  onZoomFit(): void { this.canvasService.zoomToFit(); }
  onZoomReset(): void { this.canvasService.resetZoom(); }
  onUndo(): void { this.canvasService.undo(); }
  onRedo(): void { this.canvasService.redo(); }
  onBringToFront(): void { this.editService.bringToFront(); }
  onSendToBack(): void { this.editService.sendToBack(); }
  onDeleteSelected(): void { this.editService.deleteSelected(); }
  onGroupSelected(): void { this.editService.groupSelected(); }
  onUngroupSelected(): void { this.editService.ungroupSelected(); }
  onMerge(): void { this.mergeService.mergeSelected(); }
  onJoin(): void {
    this.joinService.joinSelected();
  }

  onEntbinden(): void {
    const obj = this.canvasService.selectedObject();
    const shapeId = (obj as FabricWithData)?.data?.shapeId as string | undefined;
    if (shapeId) {
      this.connectorService.releaseShape(shapeId);
    }
  }

  onCopy(): void { this.editService.copySelected(); }
  async onPaste(): Promise<void> { await this.editService.paste(); }
  onFlipH(): void { this.editService.flipHorizontal(); }
  onFlipV(): void { this.editService.flipVertical(); }

  onExportSVG(): void { this.exportService.exportSVG(); }
  onExportPNG(): void { this.exportService.exportPNG(); }
  onExportJSON(): void { this.exportService.exportJSON(); }

  onImportClick(): void {
    this.importFileRef.nativeElement.click();
  }

  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const result = await this.importService.importFile(file);
      if (result.type === 'svg' || result.type === 'dxf') {
        await this.canvasService.loadFromSVG(result.data);
      } else {
        await this.shapeService.addImage(result.data);
      }
    } finally {
      input.value = '';
    }
  }

  onStrokeColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.toolService.setStrokeColor(input.value);
    this.styleService.applyStrokeColor(input.value);
  }

  onFillColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.toolService.setFillColor(input.value);
    this.styleService.applyFillColor(input.value);
  }

  onStrokeWidthChange(width: number): void {
    const w = Number(width);
    this.toolService.setStrokeWidth(w);
    this.styleService.applyStrokeWidth(w);
  }

  onToggleSnap(): void {
    this.toolService.setSnapEnabled(!this.toolService.snapEnabled());
  }

  onSnapSizeChange(size: number): void {
    this.toolService.setSnapSize(Number(size));
  }

  onRegularPolygonSidesChange(sides: number): void {
    this.toolService.setRegularPolygonSides(Number(sides));
  }
}
