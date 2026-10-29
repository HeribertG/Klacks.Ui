// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { RouteMapMarkerKind } from './route-map-marker-kind.type';

export interface IRouteMapMarker {
  kind: RouteMapMarkerKind;
  stopNumber: number | null;
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}
