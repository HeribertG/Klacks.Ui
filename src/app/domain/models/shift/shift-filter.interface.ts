// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseFilter } from '../base-filter.interface';
import { ShiftFilterType } from '../../enums/shift-filter-type.enum';

export interface IShiftFilter extends IBaseFilter {
  scopeFromFlag?: boolean;
  scopeUntilFlag?: boolean;
  scopeFrom?: Date;
  scopeUntil?: Date;
  showDeleteEntries?: boolean;
  activeDateRange: boolean;
  formerDateRange: boolean;
  futureDateRange: boolean;
  selectedGroup: string | undefined;
  filterType: ShiftFilterType;
  includeClientName: boolean;
  isSealedOrder: boolean;
  isTimeRange: boolean;
  isSporadic: boolean;
}
