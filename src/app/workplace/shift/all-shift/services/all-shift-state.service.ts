import { Injectable, inject } from '@angular/core';
import { IShiftFilter } from 'src/app/models/shift-data-class';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { RouteName } from 'src/app/data/management/entity-names.enum';
import { BaseStateService } from 'src/app/services/base-state.service';

@Injectable()
export class AllShiftStateService extends BaseStateService<
  IShiftFilter,
  DataManagementShiftService
> {
  constructor() {
    super(
      inject(DataManagementShiftService),
      RouteName.SHIFT,
      RouteName.EDIT_SHIFT
    );
  }

  updateShiftDateRange(
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

  setIsOriginal(isOriginal: boolean): void {
    this.dataManagementService.currentFilter.isOriginal = isOriginal;
  }
}
