// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IRouteGeometryPoint } from '../geo/route-geometry-point.interface';
import { IRouteMapMarker } from './route-map-marker.interface';

export interface IContainerRouteMap {
  markers: IRouteMapMarker[];
  path: IRouteGeometryPoint[];
  isRoadGeometry: boolean;
}
