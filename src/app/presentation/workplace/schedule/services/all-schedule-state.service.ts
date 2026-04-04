// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service managing the complete state for the Schedule workplace.
 * Extends BaseStateService to provide filter persistence and restoration.
 * Integrates with AppSettings to apply work-specific settings like payment interval.
 *
 * @relations
 * - Extends: BaseStateService
 * - Used by: ScheduleHomeComponent
 * - Uses: DataManagementScheduleService, AppSettingsManagementService
 */
import { Injectable, inject } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { BaseStateService } from 'src/app/application/services/base-state.service';
import { IWorkFilter } from 'src/app/domain/models/schedule/schedule-class';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';

@Injectable()
export class AllScheduleStateService extends BaseStateService<
  IWorkFilter,
  DataManagementScheduleService
> {
  private appSettingsService = inject(AppSettingsManagementService);
  private calendarUtil = inject(CalendarUtilService);

  constructor() {
    super(
      inject(DataManagementScheduleService),
      RouteName.SCHEDULE,
      'schedule-filter'
    );
  }

  override async initializeWorkplaceState(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();

    await super.initializeWorkplaceState();

    this.applySettingsToFilter();
    this.ensureCurrentWeek();

    if (this.dataManagementService.currentFilter.searchString) {
      await this.saveCurrentFilter();
      const searchValue = this.dataManagementService.currentFilter.searchString;
      this.searchStateService.setRestoreSearch(searchValue);
    }
  }

  private applySettingsToFilter(): void {
    const filter = this.dataManagementService.currentFilter;
    const group = this.groupSelectionService.selectedGroup;
    filter.paymentInterval = group?.paymentInterval
      ?? this.appSettingsService.workSettings().paymentInterval;
  }

  private ensureCurrentWeek(): void {
    const filter = this.dataManagementService.currentFilter;
    if (filter.paymentInterval === PaymentInterval.Weekly
      || filter.paymentInterval === PaymentInterval.Biweekly) {
      const now = new Date();
      filter.currentWeek = this.calendarUtil.getISO8601WeekNumber(now);
      filter.currentYear = now.getFullYear();
    }
  }
}