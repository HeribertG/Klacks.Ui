// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { serializedDateReviver } from './serialized-date.helper';
import { calendarDateKey } from './calendar-date.helper';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

const revive = (json: string): unknown => JSON.parse(json, serializedDateReviver);

describe('serializedDateReviver', () => {
  for (const zone of CALENDAR_TEST_ZONES) {
    describe(`in ${zone}`, () => {
      useTimeZone(zone);

      it('runs in the requested time zone', () => {
        expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
      });

      it('restores a serialized local midnight as the same calendar day', () => {
        const revived = revive(JSON.stringify(new Date(2026, 7, 3)));

        expect(revived).toBeInstanceOf(Date);
        expect(calendarDateKey(revived as Date)).toBe('2026-08-03');
      });

      it('revives Dates nested in objects and arrays', () => {
        const source = { filter: { scopeFrom: new Date(2026, 0, 31) }, works: [{ currentDate: new Date(2026, 11, 31) }] };

        const revived = revive(JSON.stringify(source)) as typeof source;

        expect(calendarDateKey(revived.filter.scopeFrom)).toBe('2026-01-31');
        expect(calendarDateKey(revived.works[0].currentDate)).toBe('2026-12-31');
      });
    });
  }

  it('leaves the backend calendar wire formats as strings', () => {
    const source = { a: '2026-08-01', b: '2026-08-01T00:00:00Z', c: '2026-08-01T00:00:00' };

    expect(revive(JSON.stringify(source))).toEqual(source);
  });

  it('leaves instants with a different fraction length or an offset as strings', () => {
    const source = { a: '2026-08-01T10:20:30.1234567Z', b: '2026-08-01T10:20:30.123+02:00', c: '2026-08-01T10:20:30.12Z' };

    expect(revive(JSON.stringify(source))).toEqual(source);
  });

  it('leaves an out-of-range value of the serialized shape as a string', () => {
    expect(revive(JSON.stringify({ a: '2026-13-45T99:00:00.000Z' }))).toEqual({ a: '2026-13-45T99:00:00.000Z' });
  });

  it('leaves non-string values untouched', () => {
    const source = { n: 5, b: true, nothing: null, text: 'hello' };

    expect(revive(JSON.stringify(source))).toEqual(source);
  });
});
