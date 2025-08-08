import { Injectable, inject } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { RouteName } from 'src/app/models/entity-names.enum';
import { BaseStateService } from 'src/app/services/base-state.service';
import { IWorkFilter } from 'src/app/models/schedule-class';

@Injectable()
export class AllScheduleStateService extends BaseStateService<
  IWorkFilter,
  DataManagementScheduleService
> {
  constructor() {
    super(
      inject(DataManagementScheduleService),
      RouteName.SCHEDULE,
      'schedule-filter'
    );
  }
  
  override async initializeWorkplaceState(): Promise<void> {
    await super.initializeWorkplaceState();
    
    if (this.dataManagementService.currentFilter.searchString) {
      await this.saveCurrentFilter();
      const searchValue = this.dataManagementService.currentFilter.searchString;
      this.searchStateService.setRestoreSearch(searchValue);
    }
  }
}