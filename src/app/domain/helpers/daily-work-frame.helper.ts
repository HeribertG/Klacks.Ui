// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Resolves where the daily work frame of a scheduling rule comes from (first start to last end of a work day,
 * pauses included), mirroring the backend chain: own rule value, else the company-wide value (law of the region
 * package), else 24h minus the minimum daily rest.
 * @param ruleSpanHours - Value of the rule; null inherits, 0 means 24h minus the minimum rest
 * @param settingsSpanHours - Company-wide value; 0 or less means none
 * @param minRestHours - Minimum daily rest that applies to the rule; 0 or less means the backend default of 11h
 */

import { DailySpanSource } from 'src/app/domain/models/scheduling/daily-span-source.model';
import { SCHEDULING_DEFAULT_MIN_REST_HOURS } from 'src/app/domain/constants/scheduling-policy-defaults.constants';
import { DAILY_SPAN_SOURCE_KEYS, DAILY_WORK_FRAME_MAX_HOURS } from 'src/app/domain/constants/daily-work-frame.constants';

export function describeDailySpanSource(
  ruleSpanHours: number | null | undefined,
  settingsSpanHours: number | null | undefined,
  minRestHours: number,
): DailySpanSource {
  if (ruleSpanHours != null && ruleSpanHours > 0) {
    return { key: DAILY_SPAN_SOURCE_KEYS.own, params: { hours: ruleSpanHours } };
  }
  if (ruleSpanHours == null && settingsSpanHours != null && settingsSpanHours > 0) {
    return { key: DAILY_SPAN_SOURCE_KEYS.settings, params: { hours: settingsSpanHours } };
  }
  const minRest = minRestHours > 0 ? minRestHours : SCHEDULING_DEFAULT_MIN_REST_HOURS;
  return { key: DAILY_SPAN_SOURCE_KEYS.derived, params: { hours: DAILY_WORK_FRAME_MAX_HOURS - minRest } };
}

export function isDailySpanInRange(value: number | null | undefined): boolean {
  return value == null || (value >= 0 && value <= DAILY_WORK_FRAME_MAX_HOURS);
}
