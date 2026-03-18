// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ITruncatedFilter } from './i-truncated-filter';

export class TruncatedFilter implements ITruncatedFilter {
  searchString = '';
  orderBy = 'name';
  sortOrder = 'asc';
  numberOfItemsPerPage = 0;
  requiredPage = 0;
}
