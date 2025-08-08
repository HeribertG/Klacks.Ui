import { Injectable, inject } from '@angular/core';
import { IGroupFilter } from 'src/app/domain/models/group-class';
import { DataManagementGroupService } from 'src/app/domain/services/data-management-group.service';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
import { BaseStateService } from 'src/app/application/services/base-state.service';

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

  updateGroupDateRange(
    activeDateRange: boolean,
    formerDateRange: boolean,
    futureDateRange: boolean
  ): void {
    this.dataManagementService.currentFilter.activeDateRange = activeDateRange;
    this.dataManagementService.currentFilter.formerDateRange = formerDateRange;
    this.dataManagementService.currentFilter.futureDateRange = futureDateRange;
  }

  setShowDeleteEntries(show: boolean): void {
    this.dataManagementService.currentFilter.showDeleteEntries = show;
  }
}
