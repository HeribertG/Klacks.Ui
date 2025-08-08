import { Injectable, inject } from '@angular/core';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { RouteName } from 'src/app/models/entity-names.enum';
import { BaseStateService } from 'src/app/services/base-state.service';
import { IBreakFilter } from 'src/app/models/break-class';

@Injectable()
export class AllAbsenceStateService extends BaseStateService<
  IBreakFilter,
  DataManagementBreakService
> {
  constructor() {
    super(
      inject(DataManagementBreakService),
      RouteName.ABSENCE,
      'absence-gantt-filter'
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