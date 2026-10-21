// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IDirectionStep } from './direction-step.interface';

export interface IRouteSegmentDirections {
  fromName: string;
  toName: string;
  transportMode: string;
  distanceKm: number;
  duration: string;
  steps: IDirectionStep[];
}
