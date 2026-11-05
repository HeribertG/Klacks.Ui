// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  AVAILABILITY_TEMPLATE_COUNT,
  availabilityTemplateKey,
  resolveAvailabilityDayType,
} from './availability-template-key.helper';
import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';
import { AvailabilityDayType } from 'src/app/domain/models/client-availability/availability-day-type.enum';

const DAY_TYPES = [
  AvailabilityDayType.Weekday,
  AvailabilityDayType.Saturday,
  AvailabilityDayType.Sunday,
  AvailabilityDayType.Holiday,
  AvailabilityDayType.OfficialHoliday,
];

const STATES = [
  AvailabilityDisplayState.Empty,
  AvailabilityDisplayState.Available,
  AvailabilityDisplayState.Blocked,
  AvailabilityDisplayState.Mixed,
];

describe('availabilityTemplateKey', () => {
  it('gives every day type, state and parity its own key inside the template range', () => {
    const keys = new Set<number>();
    for (const dayType of DAY_TYPES) {
      for (const state of STATES) {
        for (const isOdd of [false, true]) {
          const key = availabilityTemplateKey(dayType, state, isOdd);
          expect(key).toBeGreaterThanOrEqual(0);
          expect(key).toBeLessThan(AVAILABILITY_TEMPLATE_COUNT);
          keys.add(key);
        }
      }
    }
    expect(keys.size).toBe(AVAILABILITY_TEMPLATE_COUNT);
  });

  it('separates the cross from the mixed dash', () => {
    expect(availabilityTemplateKey(AvailabilityDayType.Weekday, AvailabilityDisplayState.Blocked, false)).not.toBe(
      availabilityTemplateKey(AvailabilityDayType.Weekday, AvailabilityDisplayState.Mixed, false),
    );
  });
});

describe('resolveAvailabilityDayType', () => {
  it('ranks official holiday over holiday over Sunday over Saturday', () => {
    expect(resolveAvailabilityDayType(true, true, true, true)).toBe(AvailabilityDayType.OfficialHoliday);
    expect(resolveAvailabilityDayType(true, true, true, false)).toBe(AvailabilityDayType.Holiday);
    expect(resolveAvailabilityDayType(true, true, false, false)).toBe(AvailabilityDayType.Sunday);
    expect(resolveAvailabilityDayType(true, false, false, false)).toBe(AvailabilityDayType.Saturday);
    expect(resolveAvailabilityDayType(false, false, false, false)).toBe(AvailabilityDayType.Weekday);
  });
});
