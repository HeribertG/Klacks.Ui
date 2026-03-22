// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Models for marketplace language packages.
 * @param items - List of found packages
 * @param totalCount - Total number of results
 */
export interface MarketplacePackage {
  code: string;
  name: string;
  displayName: string;
  speechLocale: string;
  version: string;
  coverage: number;
  translationCount: number;
  description: string;
  downloads: number;
  minKlacksVersion: string;
  authorName: string;
}

export interface MarketplaceSearchResult {
  items: MarketplacePackage[];
  totalCount: number;
  page: number;
  pageSize: number;
}
