// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Outcome of a server-side geocoding search: a hit, no hit, the service switched off by the operator,
 * or the geocoder (or the proxy itself) currently not answering.
 */

export const GeocodingSearchStatus = {
  Found: 'Found',
  NotFound: 'NotFound',
  Disabled: 'Disabled',
  Unavailable: 'Unavailable',
} as const;

export type GeocodingSearchStatus = (typeof GeocodingSearchStatus)[keyof typeof GeocodingSearchStatus];
