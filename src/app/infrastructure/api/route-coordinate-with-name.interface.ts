// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { RouteCoordinate } from './route-coordinate.interface';

export interface RouteCoordinateWithName extends RouteCoordinate {
  name: string;
}
