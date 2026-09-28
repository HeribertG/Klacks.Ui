// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ITruncatedFilter } from './i-truncated-filter';

export class TruncatedFilter implements ITruncatedFilter {
  searchString = '';
  orderBy = 'name';
  sortOrder = 'asc';
  numberOfItemsPerPage = 0;
  requiredPage = 0;
}
