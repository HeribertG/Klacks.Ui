// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Timing and outcome values of waiting for the schedule's chunked loading to finish before a wizard
 * run collects the visible employees and shifts.
 */
export const SCHEDULE_LOAD_POLL_INTERVAL_MS = 100;
export const SCHEDULE_LOAD_TIMEOUT_MS = 60_000;
export const SCHEDULE_LOAD_OUTCOME = {
  Complete: 'complete',
  Stalled: 'stalled',
  Timeout: 'timeout',
} as const;
