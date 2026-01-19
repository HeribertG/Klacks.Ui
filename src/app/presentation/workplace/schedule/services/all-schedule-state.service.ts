import { Injectable, inject } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { BaseStateService } from 'src/app/application/services/base-state.service';
import { IWorkFilter } from 'src/app/domain/models/schedule-class';

@Injectable()
export class AllScheduleStateService extends BaseStateService<
  IWorkFilter,
  DataManagementScheduleService
> {
  private appSettingsService = inject(AppSettingsManagementService);

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

    if (this.dataManagementService.currentFilter.searchString) {
      await this.saveCurrentFilter();
      const searchValue = this.dataManagementService.currentFilter.searchString;
      this.searchStateService.setRestoreSearch(searchValue);
    }
  }

  private applySettingsToFilter(): void {
    const filter = this.dataManagementService.currentFilter;
    const workSettings = this.appSettingsService.workSettings();
    filter.paymentInterval = workSettings.paymentInterval;
  }
}