// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataClientService } from './data-client.service';
import { Client } from 'src/app/domain/models/client/client';
import { ExportClient } from 'src/app/domain/models/client/export-client';
import { environment } from 'src/environments/environment';
import {
  activeJanuaryOffsetMinutes,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

describe('DataClientService', () => {
  let service: DataClientService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataClientService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('export filter scope', () => {
    for (const zone of ['Europe/Zurich', 'Asia/Kolkata', 'America/New_York'] as const) {
      describe(zone, () => {
        useTimeZone(zone);

        it('runs in the requested time zone', () => {
          expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
        });

        it('sends scopeFrom/scopeUntil of the export filter as UTC midnight of the chosen day', () => {
          const exportRequest = new ExportClient();
          exportRequest.filter.scopeFrom = new Date(2026, 7, 3);
          exportRequest.filter.scopeUntil = new Date(2026, 11, 31);

          service.exportList(exportRequest).subscribe();

          const req = httpTestingController.expectOne(`${environment.baseUrl}Clients/ExportList`);
          const wire = JSON.parse(JSON.stringify(req.request.body));
          expect(wire.filter.scopeFrom).toBe('2026-08-03T00:00:00.000Z');
          expect(wire.filter.scopeUntil).toBe('2026-12-31T00:00:00.000Z');
          expect(exportRequest.filter.scopeFrom).toEqual(new Date(2026, 7, 3));
          req.flush([]);
        });
      });
    }
  });

  describe('unparsable calendar dates', () => {
    it.each(['add', 'update'] as const)('reports the error through the observable on %s instead of throwing', (operation) => {
      const client = new Client();
      client.birthdate = new Date('invalid');
      const onError = vi.fn();

      const call = () => (operation === 'add' ? service.addClient(client) : service.updateClient(client));

      expect(call).not.toThrow();
      call().subscribe({ error: onError });
      expect(onError).toHaveBeenCalledWith(expect.any(RangeError));
      httpTestingController.expectNone(`${environment.baseUrl}Clients/`);
    });
  });
});
