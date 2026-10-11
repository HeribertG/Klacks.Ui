// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Backend paths of the geo service configuration and the server-side geocoding/routing proxies.
 * The browser never talks to Nominatim or OSRM itself; these endpoints answer with a status instead
 * of an error when a service is switched off, so the HTTP interceptor lets their failures through to
 * the caller (fail-closed with retry) instead of showing the generic error handling.
 */

export const GEO_SERVICES_CONFIG_PATH = 'GeoServicesConfig';

export const GEOCODING_SEARCH_PATH = 'Geocoding/Search';

export const GEOCODING_QUERY_MIN_LENGTH = 2;

export const GEOCODING_QUERY_MAX_LENGTH = 200;

export const ROUTING_DIRECTIONS_PATH = 'Routing/Directions';

export const ROUTING_OSRM_ROUTE_PATH = 'Routing/OsrmRoute';

export const GEO_SERVICES_INTERCEPTOR_PASS_THROUGH_PATHS: readonly string[] = [
  GEO_SERVICES_CONFIG_PATH,
  GEOCODING_SEARCH_PATH,
  ROUTING_OSRM_ROUTE_PATH,
];
