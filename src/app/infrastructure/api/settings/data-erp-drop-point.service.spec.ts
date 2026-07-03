// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { DataErpDropPointService } from './data-erp-drop-point.service';
import {
  IErpDropPoint,
  IErpDropPointFiles,
  IErpDropPointRequest,
} from 'src/app/domain/models/settings/erp-drop-point';

describe('DataErpDropPointService', () => {
  let service: DataErpDropPointService;
  let httpMock: HttpTestingController;
  const base = `${environment.baseUrl}ErpDropPoints`;

  const dropPoint: IErpDropPoint = {
    id: 'dp-1',
    name: 'Default',
    sourceSystemId: 'default',
    bucketPrefix: '',
    isEnabled: true,
  };

  const request: IErpDropPointRequest = {
    name: 'Default',
    sourceSystemId: 'default',
    bucketPrefix: '',
    isEnabled: false,
  };

  const files: IErpDropPointFiles = {
    pending: [
      { key: 'inbox/orders.xml', fileName: 'orders.xml', sizeBytes: 2048, lastModifiedUtc: '2026-07-01T10:00:00Z' },
    ],
    processed: [
      { key: 'processed/done.xml', fileName: 'done.xml', sizeBytes: 512, lastModifiedUtc: '2026-06-30T08:00:00Z' },
    ],
    error: [
      { key: 'error/broken.xml', fileName: 'broken.xml', sizeBytes: 128, lastModifiedUtc: '2026-06-29T07:00:00Z', errorReason: 'Invalid XML' },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataErpDropPointService,
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DataErpDropPointService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches the default drop point via GET', () => {
    service.getDefaultDropPoint().subscribe((result) => {
      expect(result).toEqual(dropPoint);
    });

    const req = httpMock.expectOne(`${base}/default`);
    expect(req.request.method).toBe('GET');
    req.flush(dropPoint);
  });

  it('updates the drop point via PUT', () => {
    const updated: IErpDropPoint = { ...dropPoint, isEnabled: false };

    service.updateDropPoint('dp-1', request).subscribe((result) => {
      expect(result).toEqual(updated);
    });

    const req = httpMock.expectOne(`${base}/dp-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(updated);
  });

  it('uploads a file via POST as multipart form data with the file field', () => {
    const file = new File(['<ErpOrderImport />'], 'orders.xml', { type: 'application/xml' });

    service.uploadFile(file).subscribe((result) => {
      expect(result.key).toBe('storage-key-1');
    });

    const req = httpMock.expectOne(`${base}/files`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush({ key: 'storage-key-1' });
  });

  it('fetches the grouped file listing via GET', () => {
    service.getFiles().subscribe((result) => {
      expect(result).toEqual(files);
    });

    const req = httpMock.expectOne(`${base}/files`);
    expect(req.request.method).toBe('GET');
    req.flush(files);
  });

  it('retries a failed file via POST with the key in the body', () => {
    service.retryFile('error/broken.xml').subscribe();

    const req = httpMock.expectOne(`${base}/files/retry`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ key: 'error/broken.xml' });
    req.flush(null);
  });

  it('triggers an import run via POST without a body', () => {
    service.triggerImportRun().subscribe();

    const req = httpMock.expectOne(`${base}/run`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null);
  });
});
