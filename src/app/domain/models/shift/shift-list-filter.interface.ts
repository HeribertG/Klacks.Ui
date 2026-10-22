// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShiftFilter } from './shift-filter.interface';

type ServerDefaultedShiftFilterKeys =
  | 'includeClientName'
  | 'isSealedOrder'
  | 'isTimeRange'
  | 'isSporadic'
  | 'selectedGroup';

export interface IShiftListFilter
  extends Omit<IShiftFilter, ServerDefaultedShiftFilterKeys>,
    Partial<Pick<IShiftFilter, ServerDefaultedShiftFilterKeys>> {}
