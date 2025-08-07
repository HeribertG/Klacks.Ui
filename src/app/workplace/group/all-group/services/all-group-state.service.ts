import { Injectable, inject } from '@angular/core';
import { IGroupFilter } from 'src/app/core/group-class';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { RouteName } from 'src/app/data/management/entity-names.enum';
import { BaseStateService } from 'src/app/services/base-state.service';

@Injectable()
export class AllGroupStateService extends BaseStateService<
  IGroupFilter,
  DataManagementGroupService
> {
  constructor() {
    super(
      inject(DataManagementGroupService),
      RouteName.GROUP,
      RouteName.EDIT_GROUP
    );
  }

  setTemporaryFilterState(): void {
    this.dataManagementService.setTemporaryGroupFilter();
  }

  isTemporaryFilterDirty(): boolean {
    return this.dataManagementService.isTemporaryGroupFilter_Dirty();
  }

  updateGroupDateRange(
    activeDateRange: boolean,
    formerDateRange: boolean,
    futureDateRange: boolean
  ): void {
    this.dataManagementService.currentFilter.activeDateRange = activeDateRange;
    this.dataManagementService.currentFilter.formerDateRange = formerDateRange;
    this.dataManagementService.currentFilter.futureDateRange = futureDateRange;
    this.clearHeaderCheckbox();
  }

  setShowDeleteEntries(show: boolean): void {
    this.dataManagementService.currentFilter.showDeleteEntries = show;
  }
}
