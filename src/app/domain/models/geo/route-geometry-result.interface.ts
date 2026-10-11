// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IRouteGeometryPoint } from './route-geometry-point.interface';
import { RouteGeometryStatus } from './route-geometry-status.model';

export interface IRouteGeometryResult {
  status: RouteGeometryStatus;
  points: IRouteGeometryPoint[];
}
