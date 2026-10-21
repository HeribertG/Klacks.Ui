// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IRouteStep } from './route-step.interface';
import { IRouteSegmentDirections } from './route-segment-directions.interface';
import { ITimeBlockResult } from './time-block-result.interface';

export interface IRouteOptimizationResult {
  optimizedRoute: IRouteStep[];
  totalDistanceKm: number;
  estimatedTravelTime: string;
  travelTimeFromStartBase: string;
  distanceFromStartBaseKm: number;
  distanceToEndBaseKm: number;
  travelTimeToEndBase: string;
  segmentDirections?: IRouteSegmentDirections[];
  totalBriefingDebriefingTime: string;
  placedTimeBlocks?: ITimeBlockResult[];
  isEstimated?: boolean;
}
