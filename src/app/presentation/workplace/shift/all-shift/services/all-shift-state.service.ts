// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Filter persistence of the shift list, including filter changes requested by a navigation that must not outlive it.
 * @param transientOverride - Fields a view request overrode, reverted again when the filter is written to storage unless
 *   the user changed one of them (then the whole override is kept)
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

  /**
   * Accepts the current view request as the user's own filter. The list calls it before it opens a shift for edit or
   * info: coming back from the editor must show the same view the user left (the plannable window), not the filter
   * from before the navigation, so that view becomes the stored filter from then on.
   */
  commitTransientOverride(): void {
    this.transientOverride.commit();
  }

  /** Commits the override as a side effect once the user changed one of its fields, so the takeover sticks. */
  protected override filterToPersist(): IShiftFilter {
    const current = this.dataManagementService.currentFilter;
    if (this.transientOverride.isTakenOver(current)) {
      this.transientOverride.commit();
    }
    return this.transientOverride.revertedCopy(current);
  }
}
