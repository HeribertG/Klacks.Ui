// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ILocation } from './location.interface';

export interface IRouteStep extends ILocation {
  order: number;
  distanceToNextKm: number;
  travelTimeToNext: string;
}
