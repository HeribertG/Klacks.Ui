// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IRouteGeometryPoint } from './route-geometry-point.interface';

export interface IRoadRouteGeometry {
  points: IRouteGeometryPoint[];
  isRoadGeometry: boolean;
}
