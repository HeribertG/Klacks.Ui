// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IRouteOptimizationResult } from './route-optimization-result.interface';
import { ITimeBlockResult } from './time-block-result.interface';

export interface IAutofillResult extends IRouteOptimizationResult {
  selectedShiftIds: string[];
  totalWorkTime: string;
  remainingTime: string;
  totalAvailableShifts: number;
  selectedShiftCount: number;
  placedTimeBlocks?: ITimeBlockResult[];
}
