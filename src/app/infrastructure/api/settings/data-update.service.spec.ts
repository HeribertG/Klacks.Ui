// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
