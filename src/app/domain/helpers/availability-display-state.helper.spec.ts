// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  formatGroupHourStates,
  nextGroupStoredValue,
  resolveGroupDisplayState,
  resolveGroupHourDisplayStates,
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
    const next = toStored(nextGroupStoredValue(states, otherHoursOfDayAvailable));
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

    it('shows an absent hour as blocked, exactly like an explicit block, when the day has an available hour', () => {
      expect(resolveHourDisplayState(undefined, true)).toBe(AvailabilityDisplayState.Blocked);
    });

    it('shows an absent hour as empty when the day has no available hour', () => {
      expect(resolveHourDisplayState(undefined, false)).toBe(AvailabilityDisplayState.Empty);
    });
  });

  describe('resolveGroupDisplayState', () => {
    it('returns the common state of all hours', () => {
      expect(resolveGroupDisplayState([true, true], true)).toBe(AvailabilityDisplayState.Available);
      expect(resolveGroupDisplayState([false, false], false)).toBe(AvailabilityDisplayState.Blocked);
      expect(resolveGroupDisplayState([undefined, undefined], true)).toBe(AvailabilityDisplayState.Blocked);
      expect(resolveGroupDisplayState([undefined, undefined], false)).toBe(AvailabilityDisplayState.Empty);
    });

    it('treats an explicit and a day-rule block in one group as the same blocked state', () => {
      expect(resolveGroupDisplayState([false, undefined], true)).toBe(AvailabilityDisplayState.Blocked);
    });

    it('returns mixed when the visible states of the hours differ', () => {
      expect(resolveGroupDisplayState([true, undefined], true)).toBe(AvailabilityDisplayState.Mixed);
      expect(resolveGroupDisplayState([false, undefined], false)).toBe(AvailabilityDisplayState.Mixed);
      expect(resolveGroupDisplayState([true, false], true)).toBe(AvailabilityDisplayState.Mixed);
    });

    it('returns empty for a group without hours', () => {
      expect(resolveGroupDisplayState([], true)).toBe(AvailabilityDisplayState.Empty);
    });
  });

  describe('nextGroupStoredValue', () => {
    it('cycles a day without a check absent -> true -> false -> absent', () => {
      expect(nextGroupStoredValue([undefined, undefined], false)).toBe(true);
      expect(nextGroupStoredValue([true, true], false)).toBe(false);
      expect(nextGroupStoredValue([false, false], false)).toBeNull();
    });

    it('turns a blocked group (explicit or by the day rule) into true on a day with another check', () => {
      expect(nextGroupStoredValue([undefined, undefined], true)).toBe(true);
      expect(nextGroupStoredValue([false, false], true)).toBe(true);
      expect(nextGroupStoredValue([false, undefined], true)).toBe(true);
    });

    it('clears an available group to no entry while the day keeps another check', () => {
      expect(nextGroupStoredValue([true, true], true)).toBeNull();
      expect(nextGroupStoredValue([true], true)).toBeNull();
    });

    it('stores false for the last check of the day, so it turns blocked instead of empty', () => {
      expect(nextGroupStoredValue([true, true], false)).toBe(false);
      expect(nextGroupStoredValue([true], false)).toBe(false);
    });

    it('sets a mixed group to true', () => {
      expect(nextGroupStoredValue([true, undefined], false)).toBe(true);
      expect(nextGroupStoredValue([true, undefined], true)).toBe(true);
      expect(nextGroupStoredValue([false, undefined], false)).toBe(true);
      expect(nextGroupStoredValue([true, false], false)).toBe(true);
    });
  });

  describe('every click changes the display', () => {
    const cases: { name: string; start: StoredAvailability[]; other: boolean }[] = [
      { name: '1h cell, day without another check', start: [undefined], other: false },
      { name: '1h cell, day with another check', start: [undefined], other: true },
      { name: '1h cell explicitly blocked, day with another check', start: [false], other: true },
      { name: '2h group, day without another check', start: [undefined, undefined], other: false },
      { name: '2h group, day with another check', start: [undefined, undefined], other: true },
      { name: '2h group explicitly blocked, day with another check', start: [false, false], other: true },
      { name: '2h mixed group (check + absent), day without another check', start: [true, undefined], other: false },
      { name: '2h mixed group (check + absent), day with another check', start: [true, undefined], other: true },
      { name: '2h mixed group (cross + absent), day without another check', start: [false, undefined], other: false },
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

    it('switches between blocked and available on a day with another check', () => {
      expect(displayAfterClicks([undefined, undefined], true).slice(0, 4)).toEqual([
        AvailabilityDisplayState.Blocked,
        AvailabilityDisplayState.Available,
        AvailabilityDisplayState.Blocked,
        AvailabilityDisplayState.Available,
      ]);
    });

    it('shows empty -> available -> blocked -> empty on a day without another check', () => {
      expect(displayAfterClicks([undefined], false).slice(0, 4)).toEqual([
        AvailabilityDisplayState.Empty,
        AvailabilityDisplayState.Available,
        AvailabilityDisplayState.Blocked,
        AvailabilityDisplayState.Empty,
      ]);
    });
  });
});

describe('hour states of a cell group', () => {
  const LABELS: Record<AvailabilityDisplayState, string> = {
    [AvailabilityDisplayState.Empty]: 'no entry',
    [AvailabilityDisplayState.Available]: 'can work',
    [AvailabilityDisplayState.Blocked]: 'blocked',
    [AvailabilityDisplayState.Mixed]: 'partly',
  };

  it('resolves each hour of the mixed 06-08 group of a client who can work 07-15', () => {
    const storedStates: StoredAvailability[] = [undefined, true];

    expect(resolveGroupDisplayState(storedStates, true)).toBe(AvailabilityDisplayState.Mixed);
    expect(resolveGroupHourDisplayStates(6, storedStates, true)).toEqual([
      { hour: 6, state: AvailabilityDisplayState.Blocked },
      { hour: 7, state: AvailabilityDisplayState.Available },
    ]);
  });

  it('resolves explicit and absent hours of a day without a check', () => {
    expect(resolveGroupHourDisplayStates(10, [false, undefined, true], false)).toEqual([
      { hour: 10, state: AvailabilityDisplayState.Blocked },
      { hour: 11, state: AvailabilityDisplayState.Empty },
      { hour: 12, state: AvailabilityDisplayState.Available },
    ]);
  });

  it('never yields the mixed state for a single hour', () => {
    const states = resolveGroupHourDisplayStates(0, [true, false, undefined], true).map((entry) => entry.state);

    expect(states).not.toContain(AvailabilityDisplayState.Mixed);
  });

  it('formats one line per hour as HH:mm followed by the state label', () => {
    const hourStates = resolveGroupHourDisplayStates(6, [undefined, true], true);

    expect(formatGroupHourStates(hourStates, (state) => LABELS[state])).toBe('06:00 blocked\n07:00 can work');
  });

  it('formats an empty group as an empty text', () => {
    expect(formatGroupHourStates([], (state) => LABELS[state])).toBe('');
  });
});
