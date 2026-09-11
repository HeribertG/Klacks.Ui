// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from './ngb-date.helper';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

const AUGUST_3 = { year: 2026, month: 8, day: 3 };

describe('ngb-date.helper', () => {
  it('returns undefined for empty and unparsable values', () => {
    expect(transformDateToNgbDateStruct(undefined)).toBeUndefined();
    expect(transformDateToNgbDateStruct('')).toBeUndefined();
    expect(transformDateToNgbDateStruct('not-a-date')).toBeUndefined();
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('activates the configured zone', () => {
        expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
      });

      it.each(['2026-08-03', '2026-08-03T00:00:00Z', '2026-08-03T00:00:00'])(
        'shows the backend value %s as 3 August in the picker',
        (wireValue) => {
          expect(transformDateToNgbDateStruct(wireValue)).toEqual(AUGUST_3);
        },
      );

      it('keeps the local day of a Date', () => {
        expect(transformDateToNgbDateStruct(new Date(2026, 7, 3))).toEqual(AUGUST_3);
      });

      it('round-trips a picked day through a local Date', () => {
        const picked = transformNgbDateStructToDate(AUGUST_3) as Date;
        expect(transformDateToNgbDateStruct(picked)).toEqual(AUGUST_3);
      });
    });
  }
});
