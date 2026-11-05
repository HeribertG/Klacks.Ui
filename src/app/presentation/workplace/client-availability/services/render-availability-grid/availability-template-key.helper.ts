// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Computes the index of a pre-rendered availability cell template from day type, display state and zebra parity.
 * Every combination maps to its own index in [0, AVAILABILITY_TEMPLATE_COUNT).
 * @param dayType - Weekday, Saturday, Sunday, holiday or official holiday (decides the background)
 * @param state - Display state of the cell (decides the symbol)
 * @param isOddSlot - Whether the cell is an odd column of its day (darker zebra background)
 */

import {
  AVAILABILITY_DISPLAY_STATE_COUNT,
  AvailabilityDisplayState,
} from 'src/app/domain/models/client-availability/availability-display-state.enum';
import {
  AVAILABILITY_DAY_TYPE_COUNT,
  AvailabilityDayType,
} from 'src/app/domain/models/client-availability/availability-day-type.enum';

const PARITY_COUNT = 2;

export const AVAILABILITY_TEMPLATE_COUNT = AVAILABILITY_DAY_TYPE_COUNT * AVAILABILITY_DISPLAY_STATE_COUNT * PARITY_COUNT;

export function availabilityTemplateKey(
  dayType: AvailabilityDayType,
  state: AvailabilityDisplayState,
  isOddSlot: boolean,
): number {
  return (dayType * AVAILABILITY_DISPLAY_STATE_COUNT + state) * PARITY_COUNT + (isOddSlot ? 1 : 0);
}

export function resolveAvailabilityDayType(
  isWeekend: boolean,
  isSunday: boolean,
  isHoliday: boolean,
  isOfficialHoliday: boolean,
): AvailabilityDayType {
  if (isOfficialHoliday) return AvailabilityDayType.OfficialHoliday;
  if (isHoliday) return AvailabilityDayType.Holiday;
  if (isSunday) return AvailabilityDayType.Sunday;
  if (isWeekend) return AvailabilityDayType.Saturday;
  return AvailabilityDayType.Weekday;
}
