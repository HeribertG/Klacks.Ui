import { Injectable, inject } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { RouteName } from 'src/app/data/management/entity-names.enum';
import { BaseStateService } from 'src/app/services/base-state.service';
import { IWorkFilter } from 'src/app/core/schedule-class';

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
  
  override initializeWorkplaceState(): void {
    super.initializeWorkplaceState();
    
    if (this.dataManagementService.currentFilter.searchString) {
      this.saveCurrentFilter();
      const searchValue = this.dataManagementService.currentFilter.searchString;
      this.dataManagementSearchService.setRestoreSearch(searchValue);
    }
  }
}