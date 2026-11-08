// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Rules for the scheduling caps (max daily hours, max weekly hours, max consecutive days): a cap is never 0.
 * Empty (null) inherits the next level, any value must be at least SCHEDULING_CAP_MIN_VALUE.
 * @param value - Cap value as entered; null means inherit (on a rule) or not typed yet (company defaults)
 * @param fallback - Value kept when the entered cap is empty or invalid (company defaults have nothing to inherit)
 */

import { SCHEDULING_CAP_MIN_VALUE } from 'src/app/domain/constants/scheduling-policy-defaults.constants';

export function isSchedulingCapValid(value: number | null | undefined): boolean {
  return value == null || value >= SCHEDULING_CAP_MIN_VALUE;
}

export function raiseSchedulingCap(value: number | null): number | null {
  return value != null && value < SCHEDULING_CAP_MIN_VALUE ? SCHEDULING_CAP_MIN_VALUE : value;
}

export function schedulingCapOr(value: number | null, fallback: number): number {
  return value != null && isSchedulingCapValid(value) ? value : fallback;
}
