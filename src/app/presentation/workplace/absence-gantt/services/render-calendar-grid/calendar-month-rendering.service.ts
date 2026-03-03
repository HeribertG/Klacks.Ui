// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { HolidayCollectionService } from '../../../../shared/grid/services/holiday-collection.service';
import { CalendarSettingService } from '../calendar-setting.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from '../../../../shared/grid/services/grid-fonts.service';
import { TranslateService } from '@ngx-translate/core';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { getDaysInMonth } from 'src/app/shared/helpers/date.helper';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from '../../../../shared/grid/enums/cell-settings.enum';
import { Gradient3DBorderStyleEnum } from '../../../../shared/grid/enums/gradient-3d-border-style';
import { CanvasAvailable } from 'src/app/domain/services/canvasAvailable.decorator';

@Injectable()
export class CalendarMonthRenderingService {
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private gridColors = inject(GridColorService);
  private holidayCollection = inject(HolidayCollectionService);
  private calendarSetting = inject(CalendarSettingService);
  private gridSetting = inject(GridSettingsService);
  private gridFonts = inject(GridFontsService);
  private translateService = inject(TranslateService);

  public isCanvasAvailable(): boolean {
    return this.ganttCanvasManager.isCanvasAvailable();
  }

  public drawMonthBackgrounds(monthsRect: Rectangle[]): void {
    let lastDays = 0;
    for (let i = 0; i < 12; i++) {
      const actualDays = getDaysInMonth(this.holidayCollection.currentYear, i);
      const leftDayCell = lastDays * this.calendarSetting.cellWidth;
      const sizeDayCell = actualDays * this.calendarSetting.cellWidth;

      const monthRec = new Rectangle(
        leftDayCell,
        0,
        leftDayCell + sizeDayCell + this.calendarSetting.cellWidth,
        this.calendarSetting.cellHeight
      );
      lastDays += actualDays;

      this.fillMonthRectangle(monthRec, i);
      monthsRect.push(monthRec);
    }
  }

  @CanvasAvailable('queue')
  private fillMonthRectangle(rec: Rectangle, monthIndex: number): void {
    const color =
      monthIndex % 2 === 0
        ? this.gridColors.evenMonthColor
        : this.gridColors.oddMonthColor;
    DrawHelper.fillRectangle(
      this.ganttCanvasManager.backgroundRowCtx!,
      color,
      rec
    );
  }

  @CanvasAvailable('queue')
  public drawMonthBorder(monthsRect: Rectangle[]): void {
    this.ganttCanvasManager.backgroundRowCtx!.save();
    this.ganttCanvasManager.backgroundRowCtx!.lineWidth = 1;
    this.ganttCanvasManager.backgroundRowCtx!.strokeStyle =
      this.gridColors.borderColorEndMonth;

    monthsRect.forEach((x) => {
      if (this.ganttCanvasManager.backgroundRowCtx!) {
        this.ganttCanvasManager.backgroundRowCtx!.moveTo(x.left, x.top);
        this.ganttCanvasManager.backgroundRowCtx!.lineTo(x.left, x.bottom);
        this.ganttCanvasManager.backgroundRowCtx!.stroke();
      }
    });
    this.ganttCanvasManager.backgroundRowCtx!.restore();
  }

  @CanvasAvailable('queue')
  public drawMonthBarOnHeadline(): void {
    let lastDays = 0;
    for (let i = 0; i < 12; i++) {
      const actualDays = getDaysInMonth(this.holidayCollection.currentYear, i);

      const leftMonthCell = lastDays * this.calendarSetting.cellWidth;
      const sizeMonthCell = actualDays * this.calendarSetting.cellWidth;
      const monthRec = new Rectangle(
        leftMonthCell,
        0,
        leftMonthCell + sizeMonthCell,
        this.calendarSetting.cellHeight
      );
      lastDays += actualDays;
      DrawHelper.fillRectangle(
        this.ganttCanvasManager.headerCtx!,
        this.gridColors.controlBackGroundColor,
        monthRec
      );

      DrawHelper.drawBorder(
        this.ganttCanvasManager.headerCtx!,
        monthRec.left,
        monthRec.top,
        monthRec.width,
        monthRec.height,
        this.gridColors.controlBackGroundColor,
        2,
        Gradient3DBorderStyleEnum.Raised
      );

      DrawHelper.drawText(
        this.ganttCanvasManager.headerCtx!,
        this.translateService.instant(this.gridSetting.monthsName[i]),
        monthRec.left,
        monthRec.top,
        monthRec.width,
        monthRec.height,
        this.gridFonts.mainFontString,
        +this.gridFonts.mainFontSize,
        this.gridColors.headerForeGroundColor,
        TextAlignmentEnum.Center,
        BaselineAlignmentEnum.Center
      );
    }
  }
}
