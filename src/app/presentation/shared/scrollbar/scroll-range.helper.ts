// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Highest scroll position a scrollbar thumb can reach.
 * @param maxValue - Total number of ticks in the scrollable range
 * @param visibleValue - Number of ticks visible without scrolling
 */
import { SCROLLBAR_CONSTANTS } from './constants';

export function maxScrollValue(maxValue: number, visibleValue: number): number {
  return maxValue - visibleValue + SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;
}
