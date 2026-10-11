// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Why the backend reports a geo service (geocoding, routing, OpenRouteService, map tiles) as disabled.
 * 'None' means the service is active.
 */

export type GeoServiceDisabledReason =
  | 'None'
  | 'DisabledByOperator'
  | 'NoOutboundTraffic'
  | 'PublicHostBlocked'
  | 'InvalidConfiguration';
