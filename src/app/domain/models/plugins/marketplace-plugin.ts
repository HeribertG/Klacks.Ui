// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Models for marketplace feature plugins.
 * @param items - List of found plugins
 * @param totalCount - Total number of results
 */
export interface MarketplacePlugin {
  name: string;
  displayName: string;
  category: string;
  version: string;
  description: string;
  minKlacksVersion: string;
  authorName: string;
  downloads: number;
  requiredPermissions: string[];
  providedSkills: string[];
}

export interface MarketplacePluginSearchResult {
  items: MarketplacePlugin[];
  totalCount: number;
  page: number;
  pageSize: number;
}
