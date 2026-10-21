// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseFilter } from 'src/app/domain/models/base-filter.interface';

export interface IDataManagementService<T extends IBaseFilter> {
  currentFilter: T;
  onExternalFilterChange?: () => void;
  restoreSearch: { set(value: string): void };
}
