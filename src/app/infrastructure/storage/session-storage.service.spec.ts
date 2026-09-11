// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { SessionStorageService } from './session-storage.service';
import { transformDateToNgbDateStruct } from 'src/app/shared/helpers/ngb-date.helper';
import { calendarDateKey } from 'src/app/shared/helpers/calendar-date.helper';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';

const FILTER_KEY = 'serialized-date-round-trip-spec';

interface StoredScheduleFilter {
  scopeFrom: Date | undefined;
  works: { currentDate: Date }[];
  searchString: string;
}

interface StoredBackendValues {
  dateOnly: string;
  utcMidnight: string;
  withoutOffset: string;
}

describe('SessionStorageService serialized dates', () => {
  let service: SessionStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionStorageService);
  });

  afterEach(async () => {
    await service.removeFilter(FILTER_KEY);
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(`in ${zone}`, () => {
      useTimeZone(zone);

      it('restores a local-midnight filter date so the datepicker shows the same day', async () => {
        const filter: StoredScheduleFilter = {
          scopeFrom: new Date(2026, 7, 3),
          works: [{ currentDate: new Date(2026, 7, 3) }],
          searchString: '',
        };

        await service.saveFilter(FILTER_KEY, filter);
        const restored = await service.restoreFilter<StoredScheduleFilter>(FILTER_KEY);

        expect(transformDateToNgbDateStruct(restored!.scopeFrom)).toEqual({ year: 2026, month: 8, day: 3 });
        expect(calendarDateKey(restored!.works[0].currentDate)).toBe('2026-08-03');
      });

      it('restores a serialized Date as the exact same instant', async () => {
        const instant = new Date(2026, 2, 29, 14, 45, 12, 345);

        await service.saveFilter(FILTER_KEY, { scopeFrom: instant });
        const restored = await service.restoreFilter<{ scopeFrom: Date }>(FILTER_KEY);

        expect(restored!.scopeFrom).toBeInstanceOf(Date);
        expect(restored!.scopeFrom.getTime()).toBe(instant.getTime());
      });

      it('leaves the backend calendar wire formats as strings', async () => {
        const values: StoredBackendValues = {
          dateOnly: '2026-08-01',
          utcMidnight: '2026-08-01T00:00:00Z',
          withoutOffset: '2026-08-01T00:00:00',
        };

        await service.saveFilter(FILTER_KEY, values);
        const restored = await service.restoreFilter<StoredBackendValues>(FILTER_KEY);

        expect(restored).toEqual(values);
      });
    });
  }
});
