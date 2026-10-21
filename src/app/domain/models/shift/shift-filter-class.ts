// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Filter state for the shift list (date ranges, filter type, sporadic/time-range flags) with a default-state check.
 */

import { BaseFilter } from '../base-filter-class';
import { IShiftFilter } from './shift-filter.interface';
import { ShiftFilterType } from '../../enums/shift-filter-type.enum';

export class ShiftFilter extends BaseFilter implements IShiftFilter {
  scopeFromFlag?: boolean;
  scopeUntilFlag?: boolean;
  scopeFrom?: Date;
  scopeUntil?: Date;
  showDeleteEntries = false;
  activeDateRange = true;
  formerDateRange = false;
  futureDateRange = false;
  filterType = ShiftFilterType.Original;
  includeClientName = false;
  isSealedOrder = false;
  isTimeRange = true;
  isSporadic = true;

  override orderBy = 'name';
  override sortOrder = 'asc';

  selectedGroup: string | undefined = undefined;

  isDefault(): boolean {
    const defaults = new ShiftFilter();
    return (
      this.activeDateRange === defaults.activeDateRange &&
      this.formerDateRange === defaults.formerDateRange &&
      this.futureDateRange === defaults.futureDateRange &&
      this.showDeleteEntries === defaults.showDeleteEntries &&
      this.filterType === defaults.filterType &&
      this.includeClientName === defaults.includeClientName &&
      this.isSealedOrder === defaults.isSealedOrder &&
      this.isTimeRange === defaults.isTimeRange &&
      this.isSporadic === defaults.isSporadic &&
      this.scopeFromFlag === undefined &&
      this.scopeUntilFlag === undefined &&
      this.scopeFrom === undefined &&
      this.scopeUntil === undefined
    );
  }
}
