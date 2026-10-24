// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Highest scroll position a scrollbar can reach (thumb drag, arrows, track click, hold): the hidden ticks plus a
 * fixed overhang (also when the visible count, rounded up, claims everything fits), or 0 without content.
 * @param maxValue - Total number of ticks in the scrollable range
 * @param visibleValue - Number of ticks visible without scrolling
 */
import { SCROLLBAR_CONSTANTS } from './constants';

export function maxScrollValue(maxValue: number, visibleValue: number): number {
  if (maxValue <= 0) {
    return 0;
  }
  return Math.max(0, maxValue - visibleValue + SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE);
}
