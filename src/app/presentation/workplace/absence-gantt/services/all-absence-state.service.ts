import { Injectable, inject } from '@angular/core';
import { DataManagementBreakService } from 'src/app/domain/services/data-management-break.service';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
import { BaseStateService } from 'src/app/application/services/base-state.service';
import { IBreakFilter } from 'src/app/domain/models/break-class';

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