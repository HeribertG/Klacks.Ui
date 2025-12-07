import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/absence/data-management-break-placeholder.service';
import { IBreakPlaceholder } from 'src/app/domain/models/break-class';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { BreakLayerService } from '../break-layer.service';
import { CalendarCalculationService } from './calendar-calculation.service';

@Injectable()
export class BreakRenderingService {
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  private dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  private breakLayerService = inject(BreakLayerService);
  private calculationService = inject(CalendarCalculationService);

  public drawRowBreaks(index: number, selectedBreak: IBreakPlaceholder | undefined): void {
    const breaks = this.dataManagementBreak.readData(index);
    if (breaks && Array.isArray(breaks) && breaks.length > 0) {
      const validBreaks = breaks.filter(
        (x) => x && typeof x === 'object' && x.from && x.until
      );

      const breaksWithLayers =
        this.breakLayerService.calculateOptimizedBreakLayers(validBreaks);

      breaksWithLayers.forEach((breakWithLayer, i) => {
        let drawBreak = true;

        if (
          selectedBreak &&
          breakWithLayer.id &&
          selectedBreak.id &&
          breakWithLayer.id === selectedBreak.id
        ) {
          drawBreak = false;
        }

        if (drawBreak) {
          try {
            const baseRec = this.calculationService.calcDateRectangle(
              breakWithLayer.from as Date,
              breakWithLayer.until as Date
            );

            const adjustedRec = this.calculationService.calcLayeredRectangle(
              baseRec,
              breakWithLayer.layer
            );

            const abs = this.dataManagementAbsence
              .absenceList()
              .find((as) => as && as.id === breakWithLayer.absenceId);

            if (abs && abs.color) {
              this.drawRowBreakWithLayer(
                adjustedRec,
                abs.color,
                breakWithLayer.layer
              );
            } else {
              console.log(`Break ${i}: No absence found or no color`);
            }
          } catch (error) {
            console.error(
              `Error drawing break ${i} with layer ${breakWithLayer.layer}:`,
              error
            );
          }
        }
      });
    }
  }

  private drawRowBreakWithLayer(
    rec: Rectangle,
    color: string,
    layer: number
  ): void {
    if (!this.ganttCanvasManager.rowCtx!) {
      return;
    }

    this.ganttCanvasManager.rowCtx!.save();

    if (layer === 0) {
      this.ganttCanvasManager.rowCtx!.globalAlpha = 1.0;
    } else {
      this.ganttCanvasManager.rowCtx!.globalAlpha = 0.85;
    }

    DrawHelper.fillRectangle(this.ganttCanvasManager.rowCtx!, color, rec);

    if (layer > 0) {
      this.ganttCanvasManager.rowCtx!.strokeStyle = DrawHelper.GetDarkColor(
        color,
        180
      );
      this.ganttCanvasManager.rowCtx!.lineWidth = 0.5;
      this.ganttCanvasManager.rowCtx!.strokeRect(
        rec.left,
        rec.top,
        rec.width,
        rec.height
      );
    }

    this.ganttCanvasManager.rowCtx!.restore();
  }

  public getRecommendedRowHeight(index: number, cellHeight: number): number {
    const breaks = this.dataManagementBreak.readData(index);

    if (!breaks || breaks.length === 0) {
      return cellHeight;
    }

    const validBreaks = breaks.filter(
      (x) => x && typeof x === 'object' && x.from && x.until
    );

    return this.breakLayerService.calculateRecommendedRowHeight(
      validBreaks,
      cellHeight
    );
  }

  public drawBreakIntern(rec: Rectangle, color: string): void {
    DrawHelper.fillRectangle(this.ganttCanvasManager.ctx!, color, rec);
  }

  public drawBreakSelectBorderIntern(rec: Rectangle): void {
    DrawHelper.drawSelectionBorder(this.ganttCanvasManager.ctx!, rec);
  }

  public drawBreakSelectBorderInternAnchor(rec: Rectangle): void {
    DrawHelper.drawAnchor(
      this.ganttCanvasManager.ctx!,
      this.calculationService.calcLeftAnchorRectangle(rec)
    );
    DrawHelper.drawAnchor(
      this.ganttCanvasManager.ctx!,
      this.calculationService.calcRightAnchorRectangle(rec)
    );
  }
}
