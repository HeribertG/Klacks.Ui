// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  nextGroupStoredValue,
  resolveGroupDisplayState,
  resolveHourDisplayState,
} from './availability-display-state.helper';
import { StoredAvailability } from 'src/app/domain/models/client-availability/stored-availability.type';
import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';

const CYCLE_CLICKS = 6;

function toStored(value: boolean | null): StoredAvailability {
  return value === null ? undefined : value;
}

function displayAfterClicks(
  start: StoredAvailability[],
  otherHoursOfDayAvailable: boolean,
): AvailabilityDisplayState[] {
  let states = [...start];
  const dayHasAvailable = (): boolean => otherHoursOfDayAvailable || states.some((s) => s === true);
  const displays = [resolveGroupDisplayState(states, dayHasAvailable())];
  for (let click = 0; click < CYCLE_CLICKS; click++) {
    const next = toStored(nextGroupStoredValue(states));
    states = states.map(() => next);
    displays.push(resolveGroupDisplayState(states, dayHasAvailable()));
  }
  return displays;
}

describe('availability-display-state.helper', () => {
  describe('resolveHourDisplayState', () => {
    it('shows a stored true hour as available', () => {
      expect(resolveHourDisplayState(true, true)).toBe(AvailabilityDisplayState.Available);
    });

    it('shows a stored false hour as blocked', () => {
      expect(resolveHourDisplayState(false, false)).toBe(AvailabilityDisplayState.Blocked);
      expect(resolveHourDisplayState(false, true)).toBe(AvailabilityDisplayState.Blocked);
    });

    it('shows an absent hour as derived blocked when the day has an available hour', () => {
      expect(resolveHourDisplayState(undefined, true)).toBe(AvailabilityDisplayState.DerivedBlocked);
    });

    it('shows an absent hour as empty when the day has no available hour', () => {
      expect(resolveHourDisplayState(undefined, false)).toBe(AvailabilityDisplayState.Empty);
    });
  });

  describe('resolveGroupDisplayState', () => {
    it('returns the common state of all hours', () => {
      expect(resolveGroupDisplayState([true, true], true)).toBe(AvailabilityDisplayState.Available);
      expect(resolveGroupDisplayState([false, false], false)).toBe(AvailabilityDisplayState.Blocked);
      expect(resolveGroupDisplayState([undefined, undefined], true)).toBe(AvailabilityDisplayState.DerivedBlocked);
      expect(resolveGroupDisplayState([undefined, undefined], false)).toBe(AvailabilityDisplayState.Empty);
    });

    it('returns mixed when the hours differ', () => {
      expect(resolveGroupDisplayState([true, undefined], true)).toBe(AvailabilityDisplayState.Mixed);
      expect(resolveGroupDisplayState([false, undefined], true)).toBe(AvailabilityDisplayState.Mixed);
      expect(resolveGroupDisplayState([false, undefined], false)).toBe(AvailabilityDisplayState.Mixed);
      expect(resolveGroupDisplayState([true, false], true)).toBe(AvailabilityDisplayState.Mixed);
    });

    it('returns empty for a group without hours', () => {
      expect(resolveGroupDisplayState([], true)).toBe(AvailabilityDisplayState.Empty);
    });
  });

  describe('nextGroupStoredValue', () => {
    it('cycles absent -> true -> false -> absent', () => {
      expect(nextGroupStoredValue([undefined, undefined])).toBe(true);
      expect(nextGroupStoredValue([true, true])).toBe(false);
      expect(nextGroupStoredValue([false, false])).toBeNull();
    });

    it('sets a mixed group to true', () => {
      expect(nextGroupStoredValue([true, undefined])).toBe(true);
      expect(nextGroupStoredValue([false, undefined])).toBe(true);
      expect(nextGroupStoredValue([true, false])).toBe(true);
    });
  });

  describe('every click changes the display', () => {
    const cases: { name: string; start: StoredAvailability[]; other: boolean }[] = [
      { name: '1h cell, day without another check', start: [undefined], other: false },
      { name: '1h cell, day with another check', start: [undefined], other: true },
      { name: '2h group, day without another check', start: [undefined, undefined], other: false },
      { name: '2h group, day with another check', start: [undefined, undefined], other: true },
      { name: '2h mixed group (check + absent), day without another check', start: [true, undefined], other: false },
      { name: '2h mixed group (cross + absent), day with another check', start: [false, undefined], other: true },
      { name: '2h mixed group (check + cross), day without another check', start: [true, false], other: false },
    ];

    for (const testCase of cases) {
      it(testCase.name, () => {
        const displays = displayAfterClicks(testCase.start, testCase.other);
        for (let i = 1; i < displays.length; i++) {
          expect(displays[i]).not.toBe(displays[i - 1]);
        }
      });
    }

    it('shows the expected sequence on a day with another check', () => {
      expect(displayAfterClicks([undefined, undefined], true).slice(0, 4)).toEqual([
        AvailabilityDisplayState.DerivedBlocked,
        AvailabilityDisplayState.Available,
        AvailabilityDisplayState.Blocked,
        AvailabilityDisplayState.DerivedBlocked,
      ]);
    });

    it('shows the expected sequence on a day without another check', () => {
      expect(displayAfterClicks([undefined], false).slice(0, 4)).toEqual([
        AvailabilityDisplayState.Empty,
        AvailabilityDisplayState.Available,
        AvailabilityDisplayState.Blocked,
        AvailabilityDisplayState.Empty,
      ]);
    });
  });
});
