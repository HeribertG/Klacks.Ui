// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Outcome of a server-side OSRM route geometry request.
 */

export const RouteGeometryStatus = {
  Ok: 'Ok',
  NoRoute: 'NoRoute',
  Disabled: 'Disabled',
  Unavailable: 'Unavailable',
} as const;

export type RouteGeometryStatus = (typeof RouteGeometryStatus)[keyof typeof RouteGeometryStatus];
