// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Filter state for the shift list (date ranges, validity period, filter type, sporadic/time-range flags, customer location countries/states/city/zip prefix) with a default-state check.
 * @param countries - Codes of the picked countries, empty = no country restriction
 * @param states - Picked (state, country) pairs, empty = no state restriction
 * @param validFrom - First day of the validity period the shifts must overlap, undefined = open towards the past
 * @param validUntil - Last day of the validity period the shifts must overlap, undefined = open towards the future
 */

import { BaseFilter } from '../base-filter-class';
import { IShiftFilter } from './shift-filter.interface';
import { ShiftFilterType } from '../../enums/shift-filter-type.enum';
import { IShiftFilterState } from './shift-filter-state.interface';

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
  countries: string[] = [];
  states: IShiftFilterState[] = [];
  city = '';
  zipPrefix = '';
  validFrom?: Date;
  validUntil?: Date;

  get isUnsealedDraftView(): boolean {
    return this.filterType === ShiftFilterType.Original && !this.isSealedOrder;
  }

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
      this.countries.length === 0 &&
      this.states.length === 0 &&
      this.validFrom === undefined &&
      this.validUntil === undefined &&
      this.city === defaults.city &&
      this.zipPrefix === defaults.zipPrefix &&
      this.scopeFromFlag === undefined &&
      this.scopeUntilFlag === undefined &&
      this.scopeFrom === undefined &&
      this.scopeUntil === undefined
    );
  }
}
