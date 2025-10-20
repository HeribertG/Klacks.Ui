import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/domain/helpers/geometry';
import { CalendarSettingService } from '../calendar-setting.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { CalendarCalculationService } from './calendar-calculation.service';

@Injectable()
export class ValidityPeriodRenderingService {
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private gridColors = inject(GridColorService);
  private calendarSetting = inject(CalendarSettingService);
  private calculationService = inject(CalendarCalculationService);

  public drawPreValidFromGrayRectangle(clientIndex: number): void {
    const validFromColumn = this.calculationService.calcValidFromColumn(clientIndex);

    if (validFromColumn <= 0) {
      return;
    }

    const grayRectangle = new Rectangle(
      0,
      0,
      validFromColumn * this.calendarSetting.cellWidth,
      this.calendarSetting.cellHeight
    );

    this.ganttCanvasManager.rowCtx!.save();
    this.ganttCanvasManager.rowCtx!.globalAlpha = 0.5;
    this.ganttCanvasManager.rowCtx!.fillStyle =
      this.gridColors.backGroundSealedColor;
    this.ganttCanvasManager.rowCtx!.fillRect(
      grayRectangle.left,
      grayRectangle.top,
      grayRectangle.width,
      grayRectangle.height
    );
    this.ganttCanvasManager.rowCtx!.restore();
  }

  public drawPostValidUntilGrayRectangle(clientIndex: number): void {
    const validUntilColumn = this.calculationService.calcValidUntilColumn(clientIndex);

    if (validUntilColumn <= 0) {
      return;
    }

    const currentYear = this.calculationService.startDate.getFullYear();
    const maxColumns = this.calculationService.calcDaysPerYear();

    const grayRectangle = new Rectangle(
      validUntilColumn * this.calendarSetting.cellWidth,
      0,
      maxColumns * this.calendarSetting.cellWidth,
      this.calendarSetting.cellHeight
    );

    this.ganttCanvasManager.rowCtx!.save();
    this.ganttCanvasManager.rowCtx!.globalAlpha = 0.5;
    this.ganttCanvasManager.rowCtx!.fillStyle =
      this.gridColors.backGroundSealedColor;
    this.ganttCanvasManager.rowCtx!.fillRect(
      grayRectangle.left,
      grayRectangle.top,
      grayRectangle.width,
      grayRectangle.height
    );
    this.ganttCanvasManager.rowCtx!.restore();
  }
}
