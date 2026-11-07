// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Fixed values of the biweekly pay-period rule, mirrored from the backend's BiweeklyPayPeriod:
 * the anchor (Monday 2025-12-29, start of ISO week 1 of 2026), the cycle length and the calendar units it uses.
 */
export const BIWEEKLY_PAY_PERIOD_ANCHOR = '2025-12-29';
export const BIWEEKLY_PAY_PERIOD_CYCLE_DAYS = 14;
export const CALENDAR_DAYS_PER_WEEK = 7;
export const ISO_WEEK_FIRST_JS_DAY = 1;
export const ISO_WEEK_THURSDAY_OFFSET_DAYS = 3;
