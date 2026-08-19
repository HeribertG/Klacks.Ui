// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Parses a client availability string into minute ranges within a single day.
 * A range whose end is not after its start runs past midnight and is split into two ranges,
 * because the consumer highlights cells of one day at a time. Equal bounds mean the whole day.
 *
 * @param availability - Comma-separated ranges, each "HH:mm-HH:mm" (seconds tolerated)
 * @returns Ranges in minutes since midnight, never crossing a day boundary
 *
 * @example
 * parseAvailabilityRanges('08:00-12:00')  // [{ startMinutes: 480, endMinutes: 720 }]
 * parseAvailabilityRanges('22:00-06:00')  // [{ 1320, 1440 }, { 0, 360 }]
 * parseAvailabilityRanges('06:00-06:00')  // [{ 0, 1440 }]
 */

import { timeToMinutes } from './time-format.helper';

const MINUTES_PER_DAY = 24 * 60;

export function parseAvailabilityRanges(
  availability: string | undefined
): { startMinutes: number; endMinutes: number }[] {
  const ranges: { startMinutes: number; endMinutes: number }[] = [];
  if (!availability) {
    return ranges;
  }

  for (const raw of availability.split(',')) {
    const [startStr, endStr] = raw.trim().split('-');
    if (!startStr || !endStr) continue;

    const start = timeToMinutes(startStr);
    const end = timeToMinutes(endStr);

    if (end === start) {
      ranges.push({ startMinutes: 0, endMinutes: MINUTES_PER_DAY });
    } else if (end > start) {
      ranges.push({ startMinutes: start, endMinutes: end });
    } else {
      ranges.push({ startMinutes: start, endMinutes: MINUTES_PER_DAY });
      ranges.push({ startMinutes: 0, endMinutes: end });
    }
  }

  return ranges;
}
