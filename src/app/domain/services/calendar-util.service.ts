// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Calendar arithmetic of the period navigation: ISO weeks and week-years, weekly and monthly bounds and the one biweekly
 * pay-period rule, mirrored from the backend's BiweeklyPayPeriod (fixed anchor 2025-12-29, 14-day cycle, aligned to the
 * configured week start of WeekConfigurationService, no ISO week parity). A weekly period is the configured week
 * (backend PeriodHoursService). A weekly or biweekly period is stored in the schedule filter as the ISO year/week of the
 * Monday inside its first configured week, so the key maps back onto the same period for every week-start day.
 * @param weekConfiguration - Supplies the configured first day of the week (JS numbering, Monday when unconfigured)
 */
import { inject, Injectable } from '@angular/core';
import { addDays, getDayIndex } from 'src/app/domain/helpers/date.helper';
import { parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import {
  BIWEEKLY_PAY_PERIOD_ANCHOR,
  BIWEEKLY_PAY_PERIOD_CYCLE_DAYS,
  CALENDAR_DAYS_PER_WEEK,
  DECEMBER_MONTH_INDEX,
  ISO_WEEK_FIRST_JS_DAY,
  ISO_WEEK_THURSDAY_OFFSET_DAYS,
  ISO_WEEKS_IN_SHORT_YEAR,
  LAST_DAY_OF_DECEMBER,
} from 'src/app/domain/constants/biweekly-pay-period.constants';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { ICalendarPeriod } from 'src/app/domain/models/calendar/calendar-period.interface';
import { IIsoWeekKey } from 'src/app/domain/models/calendar/iso-week-key.interface';
import { IBiweeklyWeeks } from 'src/app/domain/models/calendar/biweekly-weeks.interface';
import { WeekConfigurationService } from './settings/week-configuration.service';

@Injectable({
  providedIn: 'root',
})
export class CalendarUtilService {
  private readonly MS_IN_A_DAY = 24 * 60 * 60 * 1000;
  private weekConfiguration = inject(WeekConfigurationService);

  getISO8601WeekNumber(inputDate: Date): number {
    const date = new Date(inputDate.getTime());
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const thursday = date.getTime();
    date.setMonth(0);
    date.setDate(1);
    const jan1st = date.getTime();
    const days = Math.round((thursday - jan1st) / this.MS_IN_A_DAY);
    return Math.floor(days / 7) + 1;
  }

  getIsoWeekYear(date: Date): number {
    const offsetFromMonday = floorMod(date.getDay() - ISO_WEEK_FIRST_JS_DAY, CALENDAR_DAYS_PER_WEEK);
    return addDays(date, ISO_WEEK_THURSDAY_OFFSET_DAYS - offsetFromMonday).getFullYear();
  }

  getIsoWeekKey(date: Date): IIsoWeekKey {
    return { year: this.getIsoWeekYear(date), week: this.getISO8601WeekNumber(date) };
  }

  getWeekStartDate(year: number, weekNumber: number): Date {
    const jan1 = new Date(year, 0, 1);
    const jan1DayOfWeek = jan1.getDay() || 7;
    const daysToFirstMonday = jan1DayOfWeek <= 4 ? 1 - jan1DayOfWeek : 8 - jan1DayOfWeek;
    const firstMondayOfYear = new Date(year, 0, 1 + daysToFirstMonday);
    const weekStart = new Date(firstMondayOfYear);
    weekStart.setDate(firstMondayOfYear.getDate() + (weekNumber - 1) * 7);
    return weekStart;
  }

  getWeekEndDate(year: number, weekNumber: number): Date {
    const weekStart = this.getWeekStartDate(year, weekNumber);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  }

  getIsoWeeksInYear(year: number): number {
    const week = this.getISO8601WeekNumber(new Date(year, DECEMBER_MONTH_INDEX, LAST_DAY_OF_DECEMBER));
    return week === 1 ? ISO_WEEKS_IN_SHORT_YEAR : week;
  }

  /**
   * The weekly pay period containing the date: its configured week (backend PeriodHoursService, weekly interval).
   */
  getWeeklyPeriod(date: Date): ICalendarPeriod {
    const start = moveBackTo(parseCalendarDate(date) ?? date, this.weekConfiguration.weekStartDay());
    return { start, end: addDays(start, CALENDAR_DAYS_PER_WEEK - 1) };
  }

  getWeeklyPeriodOfWeek(year: number, weekNumber: number): ICalendarPeriod {
    return this.getWeeklyPeriod(this.getWeekStartDate(year, weekNumber));
  }

  /**
   * The biweekly pay period containing the date, per the configured week start (backend BiweeklyPayPeriod.Containing).
   */
  getBiweeklyPeriod(date: Date): ICalendarPeriod {
    const weekStartDay = this.weekConfiguration.weekStartDay();
    const weekStart = moveBackTo(parseCalendarDate(date) ?? date, weekStartDay);
    const anchorWeekStart = moveBackTo(parseCalendarDate(BIWEEKLY_PAY_PERIOD_ANCHOR) as Date, weekStartDay);
    const start = addDays(
      weekStart,
      -floorMod(getDayIndex(anchorWeekStart, weekStart), BIWEEKLY_PAY_PERIOD_CYCLE_DAYS),
    );
    return { start, end: addDays(start, BIWEEKLY_PAY_PERIOD_CYCLE_DAYS - 1) };
  }

  getBiweeklyPeriodOfWeek(year: number, weekNumber: number): ICalendarPeriod {
    return this.getBiweeklyPeriod(this.getWeekStartDate(year, weekNumber));
  }

  getBiweeklyWeeks(year: number, weekNumber: number): IBiweeklyWeeks {
    return this.weeksOf(this.getBiweeklyPeriodOfWeek(year, weekNumber));
  }

  getAdjacentBiweeklyStart(year: number, weekNumber: number, steps: number): IIsoWeekKey {
    const { start } = this.getBiweeklyPeriodOfWeek(year, weekNumber);
    return this.keyOfConfiguredWeek(addDays(start, steps * BIWEEKLY_PAY_PERIOD_CYCLE_DAYS));
  }

  getBiweeklyPeriodsOfYear(year: number): IBiweeklyWeeks[] {
    const periods: IBiweeklyWeeks[] = [];
    let period = this.getBiweeklyPeriodOfWeek(year, 1);
    if (this.keyOfConfiguredWeek(period.start).year < year) {
      period = this.getBiweeklyPeriod(addDays(period.start, BIWEEKLY_PAY_PERIOD_CYCLE_DAYS));
    }

    for (let weeks = this.weeksOf(period); weeks.start.year === year; weeks = this.weeksOf(period)) {
      periods.push(weeks);
      period = this.getBiweeklyPeriod(addDays(period.start, BIWEEKLY_PAY_PERIOD_CYCLE_DAYS));
    }
    return periods;
  }

  /**
   * The ISO year/week a period filter stores for the date: the start week of its biweekly period, the configured week
   * of a weekly period, otherwise its ISO week.
   */
  getWeekKeyForInterval(date: Date, paymentInterval: PaymentInterval): IIsoWeekKey {
    if (paymentInterval === PaymentInterval.Biweekly) {
      return this.keyOfConfiguredWeek(this.getBiweeklyPeriod(date).start);
    }
    if (paymentInterval === PaymentInterval.Weekly) {
      return this.keyOfConfiguredWeek(this.getWeeklyPeriod(date).start);
    }
    return this.getIsoWeekKey(date);
  }

  getMonthStartDate(year: number, month: number): Date {
    return new Date(year, month - 1, 1);
  }

  getMonthEndDate(year: number, month: number): Date {
    return new Date(year, month, 0);
  }

  private weeksOf(period: ICalendarPeriod): IBiweeklyWeeks {
    return {
      start: this.keyOfConfiguredWeek(period.start),
      end: this.keyOfConfiguredWeek(addDays(period.start, CALENDAR_DAYS_PER_WEEK)),
    };
  }

  private keyOfConfiguredWeek(weekStart: Date): IIsoWeekKey {
    const monday = addDays(weekStart, floorMod(ISO_WEEK_FIRST_JS_DAY - weekStart.getDay(), CALENDAR_DAYS_PER_WEEK));
    return this.getIsoWeekKey(monday);
  }
}

function moveBackTo(date: Date, weekStartDay: number): Date {
  return addDays(date, -floorMod(date.getDay() - weekStartDay, CALENDAR_DAYS_PER_WEEK));
}

function floorMod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}
