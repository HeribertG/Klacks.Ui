import { Injectable, inject } from '@angular/core';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { RouteName } from 'src/app/data/management/entity-names.enum';
import { BaseStateService } from 'src/app/services/base-state.service';
import { IBreakFilter } from 'src/app/core/break-class';
import { restoreFilter } from 'src/app/helpers/object-helpers';

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
  
  override initializeWorkplaceState(): void {
    super.initializeWorkplaceState();
    
    if (this.dataManagementService.currentFilter.searchString) {
      this.saveCurrentFilter();
      const searchValue = this.dataManagementService.currentFilter.searchString;
      this.dataManagementSearchService.setRestoreSearch(searchValue);
    }
  }
}