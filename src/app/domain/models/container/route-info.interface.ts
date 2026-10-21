// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IRouteLocation } from './route-location.interface';
import { IRouteSegmentDirections } from './route-segment-directions.interface';

export interface IRouteInfo {
  startBase: string;
  endBase: string;
  totalDistanceKm: number;
  estimatedTravelTime: string;
  travelTimeFromStartBase: string;
  distanceFromStartBaseKm: number;
  distanceToEndBaseKm: number;
  travelTimeToEndBase: string;
  optimizedRoute: IRouteLocation[];
  segmentDirections?: IRouteSegmentDirections[];
}
