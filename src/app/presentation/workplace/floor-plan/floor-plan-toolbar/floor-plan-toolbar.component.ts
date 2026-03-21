// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FloorPlanCanvasService } from '../services/floor-plan-canvas.service';
import { FloorPlanToolService, FloorPlanTool } from '../services/floor-plan-tool.service';
import { FloorPlanExportService } from '../services/floor-plan-export.service';
import { FloorPlanImportService } from '../services/floor-plan-import.service';
import { IconFpSelectComponent } from 'src/app/presentation/icons/icon-fp-select.component';
import { IconFpLineComponent } from 'src/app/presentation/icons/icon-fp-line.component';
import { IconFpRectangleComponent } from 'src/app/presentation/icons/icon-fp-rectangle.component';
import { IconFpCircleComponent } from 'src/app/presentation/icons/icon-fp-circle.component';
import { IconFpPolygonComponent } from 'src/app/presentation/icons/icon-fp-polygon.component';
import { IconFpPencilComponent } from 'src/app/presentation/icons/icon-fp-pencil.component';
import { IconFpTextComponent } from 'src/app/presentation/icons/icon-fp-text.component';
import { IconFpEraserComponent } from 'src/app/presentation/icons/icon-fp-eraser.component';
import { IconFpUndoComponent } from 'src/app/presentation/icons/icon-fp-undo.component';
import { IconFpRedoComponent } from 'src/app/presentation/icons/icon-fp-redo.component';
import { IconFpZoomPlusComponent } from 'src/app/presentation/icons/icon-fp-zoom-plus.component';
import { IconFpZoomMinusComponent } from 'src/app/presentation/icons/icon-fp-zoom-minus.component';
import { IconFpSaveComponent } from 'src/app/presentation/icons/icon-fp-save.component';
import { IconFpImportComponent } from 'src/app/presentation/icons/icon-fp-import.component';
import { IconFpExportComponent } from 'src/app/presentation/icons/icon-fp-export.component';

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8, 12, 16];

@Component({
  selector: 'app-floor-plan-toolbar',
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
    IconFpSaveComponent,
    IconFpImportComponent,
    IconFpExportComponent,
  ],
  templateUrl: './floor-plan-toolbar.component.html',
  styleUrls: ['./floor-plan-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanToolbarComponent {
  @ViewChild('importFileRef') importFileRef!: ElementRef<HTMLInputElement>;

  @Output() savePlan = new EventEmitter<void>();

  canvasService = inject(FloorPlanCanvasService);
  toolService = inject(FloorPlanToolService);
  private exportService = inject(FloorPlanExportService);
  private importService = inject(FloorPlanImportService);

  readonly FloorPlanTool = FloorPlanTool;
  readonly strokeWidths = STROKE_WIDTHS;

  onSave(): void {
    this.savePlan.emit();
  }

  onSelectTool(tool: FloorPlanTool): void {
    this.toolService.setTool(tool);
  }

  onZoomIn(): void {
    this.canvasService.zoomIn();
  }

  onZoomOut(): void {
    this.canvasService.zoomOut();
  }

  onZoomFit(): void {
    this.canvasService.zoomToFit();
  }

  onZoomReset(): void {
    this.canvasService.resetZoom();
  }

  onUndo(): void {
    this.canvasService.undo();
  }

  onRedo(): void {
    this.canvasService.redo();
  }

  onBringToFront(): void {
    this.canvasService.bringToFront();
  }

  onSendToBack(): void {
    this.canvasService.sendToBack();
  }

  onDeleteSelected(): void {
    this.canvasService.deleteSelected();
  }

  onExportSVG(): void {
    this.exportService.exportSVG();
  }

  onExportPNG(): void {
    this.exportService.exportPNG();
  }

  onExportJSON(): void {
    this.exportService.exportJSON();
  }

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
        await this.canvasService.addImage(result.data);
      }
    } finally {
      input.value = '';
    }
  }

  onStrokeColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.toolService.setStrokeColor(input.value);
    this.canvasService.applyStrokeColor(input.value);
  }

  onFillColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.toolService.setFillColor(input.value);
    this.canvasService.applyFillColor(input.value);
  }

  onStrokeWidthChange(width: number): void {
    this.toolService.setStrokeWidth(width);
    this.canvasService.applyStrokeWidth(width);
  }

  isToolActive(tool: FloorPlanTool): boolean {
    return this.toolService.activeTool() === tool;
  }
}
