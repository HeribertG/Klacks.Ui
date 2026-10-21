// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MarketplacePackage } from './marketplace-package';

export interface MarketplaceSearchResult {
  items: MarketplacePackage[];
  totalCount: number;
  page: number;
  pageSize: number;
}
