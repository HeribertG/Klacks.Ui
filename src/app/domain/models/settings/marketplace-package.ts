// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Models für Marketplace-Sprachpakete.
 * @param items - Liste der gefundenen Pakete
 * @param totalCount - Gesamtanzahl der Treffer
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
