// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpStatusCode } from '@angular/common/http';

import { DataScenarioVariantService } from './data-scenario-variant.service';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { environment } from 'src/environments/environment';

const FROM_DATE_WIRE = '2026-11-02T00:00:00.000Z';
const UNTIL_DATE_WIRE = '2026-11-29T00:00:00.000Z';
const RETRY_COUNT = 3;

describe('DataScenarioVariantService', () => {
  let service: DataScenarioVariantService;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataScenarioVariantService],
    });
    service = TestBed.inject(DataScenarioVariantService);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = environment.baseUrl + 'ScenarioVariants';
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getByGroup', () => {
    it('should request the variants of the group', () => {
      let received: IScenarioVariant[] = [];
      service.getByGroup('group-1').subscribe((variants) => (received = variants));

      const req = httpMock.expectOne(`${baseUrl}?groupId=group-1`);
      expect(req.request.method).toBe('GET');
      req.flush([{ id: 'v-1' }]);

      expect(received).toHaveLength(1);
    });

    it('should retry up to 3 times on transient errors', () => {
      let receivedError: unknown;
      service.getByGroup('group-1').subscribe({
        next: () => expect.unreachable('expected an error'),
        error: (error) => (receivedError = error),
      });

      for (let i = 0; i <= RETRY_COUNT; i++) {
        httpMock.expectOne(`${baseUrl}?groupId=group-1`).error(new ProgressEvent('error'));
      }

      expect(receivedError).toBeDefined();
    });
  });

  describe('getShifts', () => {
    it('should request the shifts of the variant', () => {
      let received: IShift[] = [];
      service.getShifts('v-1').subscribe((shifts) => (received = shifts));

      const req = httpMock.expectOne(`${baseUrl}/v-1/Shifts`);
      expect(req.request.method).toBe('GET');
      req.flush([{ id: 's-1' }, { id: 's-2' }]);

      expect(received).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('should post the variant with calendar days sent as wire dates', () => {
      service
        .create({ name: 'Winter', description: 'Key', groupId: 'group-1', fromDate: '2026-11-02', untilDate: '2026-11-29' })
        .subscribe();

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'Winter',
        description: 'Key',
        groupId: 'group-1',
        fromDate: FROM_DATE_WIRE,
        untilDate: UNTIL_DATE_WIRE,
      });
      req.flush({ id: 'v-1' });
    });

    it.each([400, 404, 409])('should not repeat a write the server refused with %s', (status) => {
      const request = { name: 'K', fromDate: '2026-01-01', untilDate: '2026-01-02' };

      service.update('variant-1', request).subscribe({ error: () => undefined });
      httpMock.expectOne(`${baseUrl}/variant-1`).flush(null, { status, statusText: 'Refused' });

      service.delete('variant-1').subscribe({ error: () => undefined });
      httpMock.expectOne(`${baseUrl}/variant-1`).flush(null, { status, statusText: 'Refused' });

      service.deleteShift('variant-1', 'shift-1').subscribe({ error: () => undefined });
      httpMock.expectOne(`${baseUrl}/variant-1/Shifts/shift-1`).flush(null, { status, statusText: 'Refused' });
    });

    it('should not retry a failed create, because a retried post could create the variant twice', () => {
      let receivedError: unknown;
      service
        .create({ name: 'Winter', groupId: 'group-1', fromDate: '2026-11-02', untilDate: '2026-11-29' })
        .subscribe({
          next: () => expect.unreachable('expected an error'),
          error: (error) => (receivedError = error),
        });

      httpMock.expectOne(baseUrl).error(new ProgressEvent('error'));

      expect(receivedError).toBeDefined();
    });
  });

  describe('update', () => {
    it('should put name, description and wire dates to the variant', () => {
      service
        .update('v-1', { name: 'Winter 2', fromDate: '2026-11-02', untilDate: '2026-11-29' })
        .subscribe();

      const req = httpMock.expectOne(`${baseUrl}/v-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        name: 'Winter 2',
        description: undefined,
        fromDate: FROM_DATE_WIRE,
        untilDate: UNTIL_DATE_WIRE,
      });
      req.flush({ id: 'v-1' });
    });
  });

  describe('delete', () => {
    it('should delete the variant', () => {
      service.delete('v-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/v-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('deleteShift', () => {
    it('should delete one shift of the variant', () => {
      service.deleteShift('v-1', 's-9').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/v-1/Shifts/s-9`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('copyShifts', () => {
    it('should post the selected shift ids', () => {
      service.copyShifts('v-1', { shiftIds: ['s-1', 's-2'] }).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/v-1/CopyShifts`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ shiftIds: ['s-1', 's-2'] });
      req.flush({ copiedFamilies: 2, skippedFamilies: 0 });
    });

    it('should post the source group when every shift of a group is copied', () => {
      service.copyShifts('v-1', { sourceGroupId: 'group-2' }).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/v-1/CopyShifts`);
      expect(req.request.body).toEqual({ sourceGroupId: 'group-2' });
      req.flush({ copiedFamilies: 5, skippedFamilies: 1 });
    });

    it('should not retry a copy that the server refused', () => {
      let receivedError: unknown;
      service.copyShifts('v-1', { shiftIds: ['s-1'] }).subscribe({
        next: () => expect.unreachable('expected an error'),
        error: (error) => (receivedError = error),
      });

      httpMock
        .expectOne(`${baseUrl}/v-1/CopyShifts`)
        .flush({ detail: 'refused' }, { status: HttpStatusCode.Conflict, statusText: 'Conflict' });

      expect((receivedError as { status: number }).status).toBe(HttpStatusCode.Conflict);
    });
  });
});
