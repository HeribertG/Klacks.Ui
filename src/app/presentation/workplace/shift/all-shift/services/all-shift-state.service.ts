// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Filter persistence of the shift list, including filter changes requested by a navigation that must not outlive it.
 * @param transientOverride - Fields a view request overrode, reverted again when the filter is written to storage
 */

import { Injectable, inject } from '@angular/core';
import { IShiftFilter } from 'src/app/domain/models/shift/shift-filter.interface';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { BaseStateService } from 'src/app/application/services/base-state.service';
import { TransientFilterOverride } from 'src/app/application/helpers/transient-filter-override';

@Injectable()
export class AllShiftStateService extends BaseStateService<
  IShiftFilter,
  DataManagementShiftService
> {
  private readonly transientOverride = new TransientFilterOverride<IShiftFilter>();

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

  applyTransientOverride(changes: Partial<IShiftFilter>): void {
    this.transientOverride.apply(this.dataManagementService.currentFilter, changes);
  }

  commitTransientOverride(): void {
    this.transientOverride.commit();
  }

  protected override filterToPersist(): IShiftFilter {
    return this.transientOverride.revertedCopy(this.dataManagementService.currentFilter);
  }
}
