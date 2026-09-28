// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ITruncatedFilter {
  searchString: string | undefined;
  orderBy: string;
  sortOrder: string;
  numberOfItemsPerPage: number;
  requiredPage: number;
}
