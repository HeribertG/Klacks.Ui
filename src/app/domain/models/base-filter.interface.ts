// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IBaseFilter {
  searchString: string | undefined;
  orderBy: string;
  sortOrder: string;
  numberOfItemsPerPage: number;
  requiredPage: number;
  firstItemOnLastPage: number | undefined;
  numberOfItemOnPreviousPage: number | undefined;
  isPreviousPage: boolean | undefined;
  isNextPage: boolean | undefined;
}
