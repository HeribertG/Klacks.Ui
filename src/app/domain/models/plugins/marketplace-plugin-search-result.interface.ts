// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MarketplacePlugin } from './marketplace-plugin';

export interface MarketplacePluginSearchResult {
  items: MarketplacePlugin[];
  totalCount: number;
  page: number;
  pageSize: number;
}
