import { Injectable, inject } from '@angular/core';
import { IShiftFilter } from 'src/app/domain/models/shift/shift-data-class';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { BaseStateService } from 'src/app/application/services/base-state.service';

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
    this.dataManagementService.currentFilter.filterType = isOriginal ? 0 : 1;
  }
}
