// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Period navigation of the schedule header: shows the selected week, biweekly pair or month and steps it back
 * and forth along the payment interval of the schedule filter, wrapping across ISO years.
 * @param data - Period from the calendar dropdown; month and week are only applied when set
 */
import { inject, Injectable } from '@angular/core';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { PeriodResetData } from 'src/app/presentation/shared/period-calendar-monthly/period-reset-data.interface';
import { AllScheduleStateService } from '../../services/all-schedule-state.service';
import {
  SCHEDULE_HEADER_BIWEEKLY_STEP,
  SCHEDULE_HEADER_DECEMBER_MONTH_INDEX,
  SCHEDULE_HEADER_FIRST_MONTH,
  SCHEDULE_HEADER_FIRST_WEEK,
  SCHEDULE_HEADER_LAST_DAY_OF_DECEMBER,
  SCHEDULE_HEADER_LAST_MONTH,
  SCHEDULE_HEADER_WEEK_LABEL,
  SCHEDULE_HEADER_WEEKS_IN_SHORT_ISO_YEAR,
} from '../schedule-header.constants';

@Injectable()
export class ScheduleHeaderPeriodNavigationService {
  private gridSettingsService = inject(GridSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private dataService = inject(BaseDataService);
  private allScheduleStateService = inject(AllScheduleStateService);
  private calendarUtil = inject(CalendarUtilService);

  get paymentInterval(): number {
    return this.dataManagementSchedule.workFilter.paymentInterval;
  }

  get displayYear(): string {
    return this.dataManagementSchedule.workFilter.currentYear.toString();
  }

  get displayPeriod(): string {
    switch (this.paymentInterval) {
      case PaymentInterval.Weekly:
        return `${SCHEDULE_HEADER_WEEK_LABEL} ${this.selectedWeek}`;
      case PaymentInterval.Biweekly:
        return `${SCHEDULE_HEADER_WEEK_LABEL} ${this.selectedWeek}-${Math.min(this.selectedWeek + 1, this.getWeeksInYear(this.currentYear))}`;
      case PaymentInterval.Monthly:
      default:
        return this.gridSettingsService.monthsName[
          this.dataManagementSchedule.workFilter.currentMonth - 1
        ];
    }
  }

  get selectedMonth(): number {
    return this.dataManagementSchedule.workFilter.currentMonth;
  }
  set selectedMonth(value: number) {
    this.dataManagementSchedule.workFilter.currentMonth = value;
  }

  get selectedWeek(): number {
    return this.dataManagementSchedule.workFilter.currentWeek ?? SCHEDULE_HEADER_FIRST_WEEK;
  }
  set selectedWeek(value: number) {
    this.dataManagementSchedule.workFilter.currentWeek = value;
  }

  get currentYear(): number {
    return this.dataManagementSchedule.workFilter.currentYear;
  }
  set currentYear(value: number) {
    this.dataManagementSchedule.workFilter.currentYear = value;
  }

  onCalendarReset(data: PeriodResetData): void {
    if (data.month !== undefined) {
      this.selectedMonth = data.month;
    }
    if (data.week !== undefined) {
      this.selectedWeek = data.week;
    }
    this.currentYear = data.year;
    this.applyPeriodChange();
  }

  goToPrevious(): void {
    switch (this.paymentInterval) {
      case PaymentInterval.Weekly:
        this.goToPreviousWeek();
        break;
      case PaymentInterval.Biweekly:
        this.goToPreviousBiweekly();
        break;
      case PaymentInterval.Monthly:
      default:
        this.goToPreviousMonth();
        break;
    }
  }

  goToNext(): void {
    switch (this.paymentInterval) {
      case PaymentInterval.Weekly:
        this.goToNextWeek();
        break;
      case PaymentInterval.Biweekly:
        this.goToNextBiweekly();
        break;
      case PaymentInterval.Monthly:
      default:
        this.goToNextMonth();
        break;
    }
  }

  private goToPreviousMonth(): void {
    if (this.selectedMonth === SCHEDULE_HEADER_FIRST_MONTH) {
      this.selectedMonth = SCHEDULE_HEADER_LAST_MONTH;
      this.currentYear--;
    } else {
      this.selectedMonth--;
    }
    this.applyPeriodChange();
  }

  private goToNextMonth(): void {
    if (this.selectedMonth === SCHEDULE_HEADER_LAST_MONTH) {
      this.selectedMonth = SCHEDULE_HEADER_FIRST_MONTH;
      this.currentYear++;
    } else {
      this.selectedMonth++;
    }
    this.applyPeriodChange();
  }

  private goToPreviousWeek(): void {
    if (this.selectedWeek === SCHEDULE_HEADER_FIRST_WEEK) {
      this.currentYear--;
      this.selectedWeek = this.getWeeksInYear(this.currentYear);
    } else {
      this.selectedWeek--;
    }
    this.applyPeriodChange();
  }

  private goToNextWeek(): void {
    const weeksInYear = this.getWeeksInYear(this.currentYear);
    if (this.selectedWeek >= weeksInYear) {
      this.currentYear++;
      this.selectedWeek = SCHEDULE_HEADER_FIRST_WEEK;
    } else {
      this.selectedWeek++;
    }
    this.applyPeriodChange();
  }

  private goToPreviousBiweekly(): void {
    if (this.selectedWeek <= SCHEDULE_HEADER_BIWEEKLY_STEP) {
      this.currentYear--;
      const weeksInYear = this.getWeeksInYear(this.currentYear);
      this.selectedWeek = weeksInYear % SCHEDULE_HEADER_BIWEEKLY_STEP === 1 ? weeksInYear : weeksInYear - 1;
    } else {
      this.selectedWeek -= SCHEDULE_HEADER_BIWEEKLY_STEP;
    }
    this.applyPeriodChange();
  }

  private goToNextBiweekly(): void {
    const weeksInYear = this.getWeeksInYear(this.currentYear);
    if (this.selectedWeek + SCHEDULE_HEADER_BIWEEKLY_STEP > weeksInYear) {
      this.currentYear++;
      this.selectedWeek = SCHEDULE_HEADER_FIRST_WEEK;
    } else {
      this.selectedWeek += SCHEDULE_HEADER_BIWEEKLY_STEP;
    }
    this.applyPeriodChange();
  }

  private getWeeksInYear(year: number): number {
    const dec31 = new Date(year, SCHEDULE_HEADER_DECEMBER_MONTH_INDEX, SCHEDULE_HEADER_LAST_DAY_OF_DECEMBER);
    const week = this.calendarUtil.getISO8601WeekNumber(dec31);
    return week === SCHEDULE_HEADER_FIRST_WEEK ? SCHEDULE_HEADER_WEEKS_IN_SHORT_ISO_YEAR : week;
  }

  private applyPeriodChange(): void {
    this.dataService.holidayCollection.currentYear = this.currentYear;
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();
  }
}
