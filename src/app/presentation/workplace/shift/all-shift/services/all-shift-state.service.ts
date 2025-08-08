import { Injectable, inject } from '@angular/core';
import { IShiftFilter } from 'src/app/domain/models/shift-data-class';
import { DataManagementShiftService } from 'src/app/domain/services/data-management-shift.service';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
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
