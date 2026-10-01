// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Helpers for deriving values from an optimized route returned by the backend.
 * @param route - Route steps in driving order; each step carries the leg to the following step.
 * Driving minutes round every leg to whole minutes first so that the total equals the sum of the displayed legs.
 */
import { parseTimeSpanToSeconds, sumTimeSpansToSeconds } from './time-span-format.helper';

const SECONDS_PER_MINUTE = 60;

export interface IRouteLegSource {
  travelTimeToNext: string;
}

export function calculateRouteDrivingSeconds(route: IRouteLegSource[] | null | undefined): number {
  if (!route || route.length === 0) {
    return 0;
  }
  return sumTimeSpansToSeconds(route.map((step) => step.travelTimeToNext));
}

export function calculateRouteDrivingMinutes(route: IRouteLegSource[] | null | undefined): number {
  if (!route || route.length === 0) {
    return 0;
  }
  return route.reduce(
    (sum, step) => sum + Math.round(parseTimeSpanToSeconds(step.travelTimeToNext) / SECONDS_PER_MINUTE),
    0,
  );
}
