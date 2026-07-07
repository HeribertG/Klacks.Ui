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
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';

@Injectable()
export class CalendarDayRenderingService {
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private gridColors = inject(GridColorService);
  private holidayCollection = inject(HolidayCollectionService);
  private calendarSetting = inject(CalendarSettingService);
  private calculationService = inject(CalendarCalculationService);
  private weekConfiguration = inject(WeekConfigurationService);

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
        const weekendSlot = this.weekConfiguration.getWeekendSlot(currDate);
        if (weekendSlot !== null) {
          this.drawWeekendBackground(dayRect, weekendSlot);
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
  private drawWeekendBackground(dayRect: Rectangle, weekendSlot: 1 | 2): void {
    const backgroundColor = weekendSlot === 2
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
    const weekendSlot = this.weekConfiguration.getWeekendSlot(date);

    if (weekendSlot !== null) {
      const headerDay = new CalendarHeaderDayRank();
      headerDay.name = date.getDate().toString();
      headerDay.rect = this.calculationService.calculateHeaderDayRect(
        dayRect,
        weekendSlot === 1
      );
      headerDay.backColor =
        weekendSlot === 2
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
