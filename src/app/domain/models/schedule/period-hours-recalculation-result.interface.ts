// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Answer of a manual period-hours recalculation.
 * @param accepted - True when the normal run finished or the thorough run was queued
 * @param frozenSkipped - Client pay periods left unchanged because they are sealed, exported and behind the window
 */
export interface IPeriodHoursRecalculationResult {
  accepted: boolean;
  frozenSkipped: number;
}
