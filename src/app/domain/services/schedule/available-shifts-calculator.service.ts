// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { IWorkFilter } from 'src/app/domain/models/schedule/schedule-class';
import {
  getDayIndex,
  getDaysInMonth,
} from 'src/app/shared/helpers/date.helper';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';

@Injectable({
  providedIn: 'root',
})
export class AvailableShiftsCalculatorService {
  private calendarUtil = inject(CalendarUtilService);
  private settingsService = inject(DataManagementSettingsService);

  private _availableShiftsByDay = signal<readonly (readonly string[])[]>([]);
  private _overbookedShiftsByDay = signal<readonly (readonly string[])[]>([]);

  get availableShiftsByDay(): readonly (readonly string[])[] {
    return this._availableShiftsByDay();
  }

  get overbookedShiftsByDay(): readonly (readonly string[])[] {
    return this._overbookedShiftsByDay();
  }

  calculate(shiftSchedules: IShiftSchedule[], workFilter: IWorkFilter): void {
    const startDate = this.calculateStartDate(workFilter);
    const totalDays = this.getTotalDays(workFilter);

    const hasCapacity = (shift: IShiftSchedule) =>
      shift.engaged < shift.sumEmployees * shift.quantity;

    const isOverbooked = (shift: IShiftSchedule) =>
      shift.engaged > shift.sumEmployees * shift.quantity;

    const toDayEntry = (shift: IShiftSchedule) => ({
      dayIdx: getDayIndex(startDate, new Date(shift.date)),
      abbreviation: shift.abbreviation,
    });

    const isInRange = (entry: { dayIdx: number }) =>
      entry.dayIdx >= 0 && entry.dayIdx < totalDays;

    const toUniqueAbbreviationsByDay = (
      entries: { dayIdx: number; abbreviation: string }[],
    ) =>
      Array.from({ length: totalDays }, (_, dayIdx) => [
        ...new Set(
          entries.filter((s) => s.dayIdx === dayIdx).map((s) => s.abbreviation),
        ),
      ]);

    const availableShifts = shiftSchedules
      .filter(hasCapacity)
      .map(toDayEntry)
      .filter(isInRange);

    const overbookedShifts = shiftSchedules
      .filter(isOverbooked)
      .map(toDayEntry)
      .filter(isInRange);

    this._availableShiftsByDay.set(toUniqueAbbreviationsByDay(availableShifts));
    this._overbookedShiftsByDay.set(
      toUniqueAbbreviationsByDay(overbookedShifts),
    );
  }

  private calculateStartDate(filter: IWorkFilter): Date {
    const daysBefore = this.settingsService.dayVisibleBefore;
    const periodStart = this.calculatePeriodStartDate(filter);
    return new Date(periodStart.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  }

  private calculatePeriodStartDate(filter: IWorkFilter): Date {
    const paymentInterval = filter.paymentInterval;
    const year = filter.currentYear;

    switch (paymentInterval) {
      case 0:
        return this.calendarUtil.getWeekStartDate(
          year,
          filter.currentWeek ?? 1,
        );
      case 1:
        return this.calendarUtil.getBiweeklyStartDate(
          year,
          filter.currentWeek ?? 1,
        );
      case 2:
      default:
        return new Date(year, filter.currentMonth - 1, 1);
    }
  }

  private getTotalDays(filter: IWorkFilter): number {
    const periodDays = this.getPeriodDays(filter);
    return (
      this.settingsService.dayVisibleBefore +
      periodDays +
      this.settingsService.dayVisibleAfter
    );
  }

  private getPeriodDays(filter: IWorkFilter): number {
    switch (filter.paymentInterval) {
      case 0:
        return 7;
      case 1:
        return 14;
      case 2:
      default:
        return getDaysInMonth(filter.currentYear, filter.currentMonth - 1);
    }
  }
}
