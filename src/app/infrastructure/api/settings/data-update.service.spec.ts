// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { DataUpdateService } from './data-update.service';

describe('DataUpdateService', () => {
  let service: DataUpdateService;
  let httpMock: HttpTestingController;
  const base = `${environment.baseUrl}update`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DataUpdateService, provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataUpdateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches status', () => {
    service.getStatus().subscribe(s => expect(s.currentVersion).toBe('1.0.0'));
    const req = httpMock.expectOne(`${base}/Status`);
    expect(req.request.method).toBe('GET');
    req.flush({ currentVersion: '1.0.0', availability: null, activeOperation: null, lastOperation: null });
  });

  it('triggers an update via POST', () => {
    service.triggerUpdate().subscribe(r => expect(r.enqueued).toBe(true));
    const req = httpMock.expectOne(`${base}/Trigger`);
    expect(req.request.method).toBe('POST');
    req.flush({ enqueued: true, operationId: 'abc', reason: 'Update enqueued.' });
  });

  it('starts the engine upgrade via POST without a body', () => {
    let result: unknown;
    service.startEngineUpgrade().subscribe(r => (result = r));
    const req = httpMock.expectOne(`${environment.baseUrl}update/EngineUpgrade`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ enqueued: true, operationId: 'op-9', blockedReason: null });
    expect(result).toEqual({ enqueued: true, operationId: 'op-9', blockedReason: null });
  });

  it('returns the blocked reason of a 409 as a result instead of an error', () => {
    let result: unknown;
    service.startEngineUpgrade().subscribe(r => (result = r));
    httpMock
      .expectOne(`${environment.baseUrl}update/EngineUpgrade`)
      .flush({ enqueued: false, operationId: null, blockedReason: 'OperationInProgress' }, { status: 409, statusText: 'Conflict' });
    expect(result).toEqual({ enqueued: false, operationId: null, blockedReason: 'OperationInProgress' });
  });

  it('passes any other failure of the engine upgrade on as an error', () => {
    let status: number | null = null;
    service.startEngineUpgrade().subscribe({ error: (e: { status: number }) => (status = e.status) });
    httpMock.expectOne(`${environment.baseUrl}update/EngineUpgrade`).flush(null, { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
  });

  it('saves config via PUT', () => {
    const config = {
      autoEnabled: true, channel: 'Beta', checkIntervalHours: 8,
      maintenanceWindowStart: '', maintenanceWindowEnd: '', notifyOnly: false,
      backupRetentionCount: 3, pinnedVersion: '',
    };
    service.saveConfig(config).subscribe(c => expect(c.channel).toBe('Beta'));
    const req = httpMock.expectOne(`${base}/Config`);
    expect(req.request.method).toBe('PUT');
    req.flush(config);
  });
});
