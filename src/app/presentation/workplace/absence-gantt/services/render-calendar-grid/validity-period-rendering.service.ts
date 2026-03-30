// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { CalendarSettingService } from '../calendar-setting.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { CalendarCalculationService } from './calendar-calculation.service';
import { GanttCoordinateService } from '../gantt-coordinate.service';

@Injectable()
export class ValidityPeriodRenderingService {
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private gridColors = inject(GridColorService);
  private calendarSetting = inject(CalendarSettingService);
  private calculationService = inject(CalendarCalculationService);
  private coord = inject(GanttCoordinateService);

  public drawPreValidFromGrayRectangle(clientIndex: number): void {
    const validFromColumn = this.calculationService.calcValidFromColumn(clientIndex);

    if (validFromColumn <= 0) {
      return;
    }

    const left = this.coord.spanLeft(0, validFromColumn - 1);
    const right = this.coord.spanRight(0, validFromColumn - 1);
    const grayRectangle = new Rectangle(
      Math.floor(left),
      0,
      Math.floor(right),
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

    const maxColumns = this.calculationService.calcDaysPerYear();
    const left = this.coord.spanLeft(validUntilColumn, maxColumns - 1);
    const right = this.coord.spanRight(validUntilColumn, maxColumns - 1);

    const grayRectangle = new Rectangle(
      Math.floor(left),
      0,
      Math.floor(right),
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
