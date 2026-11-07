// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Period navigation of the schedule header: shows the selected week, biweekly period or month and steps it back
 * and forth along the payment interval of the schedule filter, wrapping across ISO years. Biweekly steps move the
 * pay period by 14 days (CalendarUtilService.getAdjacentBiweeklyStart) and store the ISO year/week of its start week,
 * so the 53-week ISO year 2026 is crossed without overlapping periods.
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
  SCHEDULE_HEADER_FIRST_MONTH,
  SCHEDULE_HEADER_FIRST_WEEK,
  SCHEDULE_HEADER_LAST_MONTH,
  SCHEDULE_HEADER_WEEK_LABEL,
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
      case PaymentInterval.Biweekly: {
        const weeks = this.calendarUtil.getBiweeklyWeeks(this.currentYear, this.selectedWeek);
        return `${SCHEDULE_HEADER_WEEK_LABEL} ${weeks.start.week}-${weeks.end.week}`;
      }
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
      this.selectedWeek = this.calendarUtil.getIsoWeeksInYear(this.currentYear);
    } else {
      this.selectedWeek--;
    }
    this.applyPeriodChange();
  }

  private goToNextWeek(): void {
    const weeksInYear = this.calendarUtil.getIsoWeeksInYear(this.currentYear);
    if (this.selectedWeek >= weeksInYear) {
      this.currentYear++;
      this.selectedWeek = SCHEDULE_HEADER_FIRST_WEEK;
    } else {
      this.selectedWeek++;
    }
    this.applyPeriodChange();
  }

  private goToPreviousBiweekly(): void {
    this.stepBiweekly(-1);
  }

  private goToNextBiweekly(): void {
    this.stepBiweekly(1);
  }

  private stepBiweekly(steps: number): void {
    const key = this.calendarUtil.getAdjacentBiweeklyStart(this.currentYear, this.selectedWeek, steps);
    this.currentYear = key.year;
    this.selectedWeek = key.week;
    this.applyPeriodChange();
  }

  private applyPeriodChange(): void {
    this.dataService.holidayCollection.currentYear = this.currentYear;
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();
  }
}
