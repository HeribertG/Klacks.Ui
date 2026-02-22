// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { CalendarHeaderDayRank } from 'src/app/domain/models/absence/absence-class';
import { HolidayCollectionService } from '../../../../shared/grid/services/holiday-collection.service';
import { CalendarSettingService } from '../calendar-setting.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { compareDate } from 'src/app/shared/helpers/date.helper';
import { CanvasAvailable } from 'src/app/domain/services/canvasAvailable.decorator';
import { CalendarCalculationService } from './calendar-calculation.service';

@Injectable()
export class CalendarDayRenderingService {
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private gridColors = inject(GridColorService);
  private holidayCollection = inject(HolidayCollectionService);
  private calendarSetting = inject(CalendarSettingService);
  private calculationService = inject(CalendarCalculationService);

  private readonly SUNDAY = 0;
  private readonly SATURDAY = 6;

  public isCanvasAvailable(): boolean {
    return this.ganttCanvasManager.isCanvasAvailable();
  }

  public drawDayBackgrounds(
    daysPerYear: number,
    headerDayRank: CalendarHeaderDayRank[]
  ): void {
    for (let i = 0; i < daysPerYear; i++) {
      const currDate = new Date(this.calculationService.startDate);
      currDate.setDate(currDate.getDate() + i);
      const dayRect = this.calculationService.calculateDayRectangle(i);

      if (this.isHoliday(currDate)) {
        this.drawHolidayBackground(dayRect, currDate);
      } else {
        const dayOfWeek = currDate.getDay();
        if (dayOfWeek === this.SUNDAY || dayOfWeek === this.SATURDAY) {
          this.drawWeekendBackground(dayRect, dayOfWeek === this.SUNDAY);
        } else {
          this.drawWeekdayBorder(dayRect);
        }
      }

      this.addDayNumberToHeader(currDate, dayRect, headerDayRank);
    }
  }

  private isHoliday(date: Date): boolean {
    if (
      !this.holidayCollection.holidays ||
      this.holidayCollection.holidays.holidayList.length === 0
    ) {
      return false;
    }

    this.ensureCorrectYearLoaded(date);

    return this.holidayCollection.holidays.holidayList.some(
      (x) => compareDate(x.currentDate, date)
    );
  }

  @CanvasAvailable('queue')
  private drawHolidayBackground(dayRect: Rectangle, date: Date): void {
    this.ensureCorrectYearLoaded(date);

    const holiday = this.holidayCollection.holidays!.holidayList.find(
      (x) => compareDate(x.currentDate, date)
    );
    if (holiday) {
      const color = holiday.officially
        ? this.gridColors.backGroundColorOfficiallyHoliday
        : this.gridColors.backGroundColorHolyday;
      DrawHelper.fillRectangle(
        this.ganttCanvasManager.backgroundRowCtx!,
        color,
        dayRect
      );
      DrawHelper.drawBaseBorder(
        this.ganttCanvasManager.backgroundRowCtx!,
        this.gridColors.borderColor,
        this.calendarSetting.increaseBorder,
        dayRect
      );
    }
  }

  @CanvasAvailable('queue')
  private drawWeekendBackground(dayRect: Rectangle, isWeekend: boolean): void {
    const backgroundColor = isWeekend
      ? this.gridColors.backGroundColorSunday
      : this.gridColors.backGroundColorSaturday;

    DrawHelper.fillRectangle(
      this.ganttCanvasManager.backgroundRowCtx!,
      backgroundColor,
      dayRect
    );
    DrawHelper.drawBaseBorder(
      this.ganttCanvasManager.backgroundRowCtx!,
      this.gridColors.borderColor,
      this.calendarSetting.increaseBorder,
      dayRect
    );
  }

  @CanvasAvailable('queue')
  private drawWeekdayBorder(dayRect: Rectangle): void {
    DrawHelper.drawBaseBorder(
      this.ganttCanvasManager.backgroundRowCtx!,
      this.gridColors.borderColor,
      0.5,
      dayRect
    );
  }

  private addDayNumberToHeader(
    date: Date,
    dayRect: Rectangle,
    headerDayRank: CalendarHeaderDayRank[]
  ): void {
    const dayOfWeek = date.getDay();

    if (dayOfWeek === this.SUNDAY || dayOfWeek === this.SATURDAY) {
      const headerDay = new CalendarHeaderDayRank();
      headerDay.name = date.getDate().toString();
      headerDay.rect = this.calculationService.calculateHeaderDayRect(
        dayRect,
        dayOfWeek === this.SATURDAY
      );
      headerDay.backColor =
        dayOfWeek === this.SUNDAY
          ? this.gridColors.backGroundColorSunday
          : this.gridColors.backGroundColorSaturday;

      headerDayRank.push(headerDay);
    }
  }

  private ensureCorrectYearLoaded(date: Date): void {
    const year = date.getFullYear();
    const currentYear = this.holidayCollection.currentYear;

    if (year < currentYear - 1 || year > currentYear + 1) {
      this.holidayCollection.currentYear = year;
    }
  }
}
