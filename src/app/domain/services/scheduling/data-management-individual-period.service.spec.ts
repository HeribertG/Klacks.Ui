// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { DataManagementIndividualPeriodService } from './data-management-individual-period.service';
import { IndividualPeriodApiService } from 'src/app/infrastructure/api/scheduling/individual-period-api.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { IIndividualPeriod } from 'src/app/domain/models/scheduling/individual-period.model';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

function backendPeriod(fromDate: string, untilDate: string | undefined): IIndividualPeriod {
  return {
    id: 'period-1',
    name: 'Custom',
    periods: [
      {
        id: 'row-1',
        fromDate: fromDate as unknown as Date,
        untilDate: untilDate as unknown as Date | undefined,
        fullHours: 160,
      },
    ],
  };
}

describe('DataManagementIndividualPeriodService', () => {
  let service: DataManagementIndividualPeriodService;
  let getAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getAll = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        DataManagementIndividualPeriodService,
        { provide: IndividualPeriodApiService, useValue: { getAll } },
        { provide: EVENT_BUS_TOKEN, useValue: { emit: vi.fn() } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });
    service = TestBed.inject(DataManagementIndividualPeriodService);
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('activates the configured zone', () => {
        expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
      });

      it('loads DateOnly period rows as local midnight of their own day', async () => {
        getAll.mockResolvedValue([backendPeriod('2026-08-03', '2026-08-31')]);

        await service.readIndividualPeriods();

        const row = service.individualPeriods[0].periods[0];
        expect(formatDateOnly(row.fromDate)).toBe('2026-08-03');
        expect(row.fromDate.getHours()).toBe(0);
        expect(formatDateOnly(row.untilDate as Date)).toBe('2026-08-31');
      });

      it('keeps an open-ended row without untilDate', async () => {
        getAll.mockResolvedValue([backendPeriod('2026-08-03', undefined)]);

        await service.readIndividualPeriods();

        expect(service.individualPeriods[0].periods[0].untilDate).toBeUndefined();
      });

      it('accepts a one-day row whose from and until are the same backend day', () => {
        const errors = service.validateIndividualPeriod(backendPeriod('2026-08-03', '2026-08-03'));

        expect(errors).toEqual([]);
      });

      it('rejects a row whose until lies before its from', () => {
        const errors = service.validateIndividualPeriod(backendPeriod('2026-08-03', '2026-08-02'));

        expect(errors).toEqual(['setting.individualPeriod.validation.invalidDateRange']);
      });
    });
  }
});
