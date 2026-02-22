// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { EntrySource } from 'src/app/domain/enums/entry-source.enum';
import { Gradient3DBorderStyleEnum } from 'src/app/presentation/shared/grid/enums/gradient-3d-border-style';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-class';
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
                breakWithLayer.layer,
                breakWithLayer.entrySource
              );
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
    layer: number,
    entrySource: EntrySource
  ): void {
    if (!this.ganttCanvasManager.rowCtx!) {
      return;
    }

    const ctx = this.ganttCanvasManager.rowCtx!;
    ctx.save();

    if (layer === 0) {
      ctx.globalAlpha = 1.0;
    } else {
      ctx.globalAlpha = 0.85;
    }

    DrawHelper.fillRectangle(ctx, color, rec);

    if (entrySource === EntrySource.Schedule) {
      DrawHelper.drawBorder(
        ctx,
        rec.left,
        rec.top,
        rec.width,
        rec.bottom,
        color,
        3,
        Gradient3DBorderStyleEnum.Raised
      );
    } else if (layer > 0) {
      ctx.strokeStyle = DrawHelper.GetDarkColor(color, 180);
      ctx.lineWidth = 0.5;
      ctx.strokeRect(rec.left, rec.top, rec.width, rec.height);
    }

    ctx.restore();
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

  public drawBreakIntern(rec: Rectangle, color: string, entrySource?: EntrySource): void {
    DrawHelper.fillRectangle(this.ganttCanvasManager.ctx!, color, rec);
    if (entrySource === EntrySource.Schedule) {
      DrawHelper.drawBorder(
        this.ganttCanvasManager.ctx!,
        rec.left,
        rec.top,
        rec.width,
        rec.bottom,
        color,
        3,
        Gradient3DBorderStyleEnum.Raised
      );
    }
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
