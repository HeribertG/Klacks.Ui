// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IBaseTruncated {
  maxItems: number;
  maxPages: number;
  currentPage: number;
  firstItemOnPage: number;
}
