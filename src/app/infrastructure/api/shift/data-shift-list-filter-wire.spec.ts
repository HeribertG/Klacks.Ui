// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataShiftService } from './data-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { ShiftFilter } from 'src/app/domain/models/shift/shift-filter-class';
import { ITruncatedShift } from 'src/app/domain/models/shift/truncated-shift.interface';
import { environment } from 'src/environments/environment';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';

const LIST_URL = `${environment.baseUrl}Shifts/GetSimpleList/`;

describe('DataShiftService shift list filter wire format', () => {
  let service: DataShiftService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), WorkTimeCalculationService],
    });
    service = TestBed.inject(DataShiftService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  const send = (filter: ShiftFilter) => {
    service.readShiftList(filter).subscribe();
    const req = httpTestingController.expectOne(LIST_URL);
    req.flush({ shifts: [] } as unknown as ITruncatedShift);
    return req.request.body;
  };

  it('sends the location lists and texts with the names the backend binds', () => {
    const filter = new ShiftFilter();
    filter.countries = ['CH', 'DE'];
    filter.states = [{ state: 'BE', country: 'CH' }];
    filter.city = 'Bern';
    filter.zipPrefix = '30';

    const body = send(filter);

    expect(body.countries).toEqual(['CH', 'DE']);
    expect(body.states).toEqual([{ state: 'BE', country: 'CH' }]);
    expect(body.city).toBe('Bern');
    expect(body.zipPrefix).toBe('30');
  });

  it('sends empty lists and no period for the default filter', () => {
    const body = send(new ShiftFilter());

    expect(body.countries).toEqual([]);
    expect(body.states).toEqual([]);
    expect(body.validFrom).toBeUndefined();
    expect(body.validUntil).toBeUndefined();
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('sends the validity period as UTC midnight of the chosen calendar days', () => {
        const filter = new ShiftFilter();
        filter.validFrom = new Date(2026, 2, 1);
        filter.validUntil = new Date(2026, 2, 31);

        const body = send(filter);

        expect(body.validFrom).toBe('2026-03-01T00:00:00.000Z');
        expect(body.validUntil).toBe('2026-03-31T00:00:00.000Z');
      });

      it('sends only the bound that is set', () => {
        const filter = new ShiftFilter();
        filter.validFrom = new Date(2026, 2, 1);

        const body = send(filter);

        expect(body.validFrom).toBe('2026-03-01T00:00:00.000Z');
        expect(body.validUntil).toBeUndefined();
      });
    });
  }
});
