// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { DataErpDropPointService } from './data-erp-drop-point.service';
import { IErpDropPoint } from 'src/app/domain/models/settings/erp-drop-point';
import { IErpDropPointFiles } from 'src/app/domain/models/settings/erp-drop-point-files.interface';
import { IErpDropPointRequest } from 'src/app/domain/models/settings/erp-drop-point-request.interface';
import { IErpImportFile } from 'src/app/domain/models/settings/erp-import-file';
import { ErpImportFileStatus } from 'src/app/domain/enums/erp-import-file-status.enum';
import { ErpImportChannel } from 'src/app/domain/enums/erp-import-channel.enum';

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

  const fileId = '3f2b8c1e-0d4a-4b6e-9f1a-2c3d4e5f6a7b';

  const importFile = (id: string, status: ErpImportFileStatus): IErpImportFile => ({
    id,
    fileName: `${id}.xml`,
    sizeBytes: 512,
    status,
    channel: ErpImportChannel.UiUpload,
    uploadedBy: 'admin',
    receivedAt: '2026-10-19T08:00:00Z',
    startedAt: null,
    finishedAt: null,
    processedOrders: 0,
    totalOrders: null,
    newCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    supersededCount: 0,
    rejectedCount: 0,
    failureReason: null,
    duplicateOfReceivedAt: null,
    rejectedOrders: [],
  });

  const files: IErpDropPointFiles = {
    inbox: [importFile('inbox-1', ErpImportFileStatus.Received)],
    processed: [importFile('done-1', ErpImportFileStatus.Completed)],
    failed: [importFile(fileId, ErpImportFileStatus.Failed)],
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

  it('does not retry a failed file listing on its own (the polling counts failures)', () => {
    let status: number | null = null;
    service.getFiles().subscribe({ error: (error) => (status = error.status) });

    httpMock.expectOne(`${base}/files`).flush(null, { status: 500, statusText: 'Server Error' });

    httpMock.expectNone(`${base}/files`);
    expect(status).toBe(500);
  });

  it('retries a failed file by its ledger id via POST files/{id}/retry and returns the new status', () => {
    const retryResult = { id: fileId, status: ErpImportFileStatus.Received, failureReason: null };
    let received: unknown;

    service.retryFile(fileId).subscribe((result) => (received = result));

    const req = httpMock.expectOne(`${base}/files/${fileId}/retry`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(retryResult);
    expect(received).toEqual(retryResult);
  });

  it('deletes a failed file by its ledger id via DELETE files/{id} without a body', () => {
    service.deleteFile(fileId).subscribe();

    const req = httpMock.expectOne(`${base}/files/${fileId}`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toBeNull();
    req.flush(null);
  });

  it('url-encodes the file id so it can never address another route', () => {
    service.deleteFile('a/b').subscribe();

    const req = httpMock.expectOne(`${base}/files/a%2Fb`);
    expect(req.request.method).toBe('DELETE');
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
