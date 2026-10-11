// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { GeocodingSearchStatus } from './geocoding-search-status.model';

export interface IGeocodingSearchResult {
  status: GeocodingSearchStatus;
  latitude: number | null;
  longitude: number | null;
  displayName: string | null;
}
