// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { AvailabilitySettingService } from '../availability-setting.service';
import {
  HourGroupingMode,
  HOUR_GROUPING_SIZES,
} from 'src/app/domain/models/client-availability/hour-grouping-mode.enum';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { compareDate } from 'src/app/shared/helpers/date.helper';

export interface DateHourRange {
  date: Date;
  dateString: string;
  startHour: number;
  endHour: number;
}

@Injectable()
export class AvailabilityCalculationService {
  private settings = inject(AvailabilitySettingService);
  private holidayCollection = inject(HolidayCollectionService);

  public startDate: Date = new Date();

  public get daysInView(): number {
    switch (this.settings.viewMode()) {
      case PaymentInterval.Weekly:
        return 7;
      case PaymentInterval.Biweekly:
        return 14;
      case PaymentInterval.Monthly:
        return 31;
      default:
        return 7;
    }
  }

  public get totalColumns(): number {
    return this.daysInView * this.settings.columnsPerDay;
  }

  public getWidth(): number {
    return this.totalColumns * this.settings.cellWidth;
  }

  public columnToDateHour(col: number): DateHourRange {
    const columnsPerDay = this.settings.columnsPerDay;
    const dayIndex = Math.floor(col / columnsPerDay);
    const slotIndex = col % columnsPerDay;
    const groupSize = HOUR_GROUPING_SIZES[this.settings.hourGroupingMode()];

    const date = new Date(this.startDate);
    date.setDate(date.getDate() + dayIndex);

    const startHour = slotIndex * groupSize;
    const endHour = startHour + groupSize;

    return {
      date,
      dateString: this.formatDateOnly(date),
      startHour,
      endHour,
    };
  }

  public dateHourToColumn(date: Date, hour: number): number {
    const diffTime = date.getTime() - this.startDate.getTime();
    const dayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const groupSize = HOUR_GROUPING_SIZES[this.settings.hourGroupingMode()];
    const slotIndex = Math.floor(hour / groupSize);
    return dayIndex * this.settings.columnsPerDay + slotIndex;
  }

  public visibleCol(scrollX: number): number {
    return Math.floor(scrollX / this.settings.cellWidth);
  }

  public visibleRow(scrollY: number): number {
    return Math.floor(scrollY / this.settings.cellHeight);
  }

  public visibleColCount(width: number): number {
    return Math.ceil(width / this.settings.cellWidth) + 1;
  }

  public visibleRowCount(height: number): number {
    return Math.ceil(
      (height - this.settings.cellHeaderHeight) / this.settings.cellHeight
    ) + 1;
  }

  public getSlotLabel(slotIndex: number): string {
    const mode = this.settings.hourGroupingMode();
    const groupSize = HOUR_GROUPING_SIZES[mode];
    const startHour = slotIndex * groupSize;

    switch (mode) {
      case HourGroupingMode.OneHour:
        return `${startHour}`;
      case HourGroupingMode.TwoHour:
        return `${startHour}-${startHour + 1}`;
      case HourGroupingMode.FourHour:
        return `${startHour}-${startHour + 3}`;
      case HourGroupingMode.AmPm:
        return slotIndex === 0 ? 'VM' : 'NM';
      default:
        return `${startHour}`;
    }
  }

  public formatDateOnly(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  public formatDayLabel(date: Date, isMonthly: boolean): string {
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = date.getMonth() + 1;

    if (isMonthly) {
      return `${dayName} ${day}.`;
    }
    return `${dayName} ${day}.${String(month).padStart(2, '0')}`;
  }

  public isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  public isSunday(date: Date): boolean {
    return date.getDay() === 0;
  }

  public isHoliday(date: Date): boolean {
    const holidays = this.holidayCollection.holidays;
    if (!holidays || holidays.holidayList.length === 0) {
      return false;
    }
    return holidays.holidayList.some((x) => compareDate(x.currentDate, date));
  }

  public isOfficialHoliday(date: Date): boolean {
    const holidays = this.holidayCollection.holidays;
    if (!holidays || holidays.holidayList.length === 0) {
      return false;
    }
    const found = holidays.holidayList.find((x) => compareDate(x.currentDate, date));
    return found?.officially === true;
  }
}
