// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ITruncatedFilter {
  searchString: string | undefined;
  orderBy: string;
  sortOrder: string;
  numberOfItemsPerPage: number;
  requiredPage: number;
}
