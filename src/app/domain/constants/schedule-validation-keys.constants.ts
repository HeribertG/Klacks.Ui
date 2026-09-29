// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Translation keys of schedule validation entries, mirroring the backend's ScheduleValidationKeys.
 * WEEK_SCOPED_VALIDATION_KEYS lists the entries the backend re-evaluates for a whole ISO week whenever
 * a single day of that week is checked. Their date can be any day of the week — the weekly checks
 * anchor on Monday, the consecutive-day check on the day its run starts — so the live merge has to
 * retract them by week rather than by exact date.
 * SCHEDULE_VALIDATION_KEY_REST_VIOLATION is dated with the day of the PREVIOUS block's owner, so the pair
 * (X-1 -> X) sits on X-1; a re-check of day X therefore also retracts that key on X-1.
 */
export const SCHEDULE_VALIDATION_KEY_WEEKLY_OVERTIME =
  'schedule.error-list.weekly-overtime';
export const SCHEDULE_VALIDATION_KEY_MIN_REST_DAYS =
  'schedule.error-list.min-rest-days';
export const SCHEDULE_VALIDATION_KEY_REST_VIOLATION =
  'schedule.error-list.rest-violation';
export const SCHEDULE_VALIDATION_KEY_CONSECUTIVE_DAYS =
  'schedule.error-list.consecutive-days';

export const WEEK_SCOPED_VALIDATION_KEYS: readonly string[] = [
  SCHEDULE_VALIDATION_KEY_WEEKLY_OVERTIME,
  SCHEDULE_VALIDATION_KEY_MIN_REST_DAYS,
  SCHEDULE_VALIDATION_KEY_CONSECUTIVE_DAYS,
];
