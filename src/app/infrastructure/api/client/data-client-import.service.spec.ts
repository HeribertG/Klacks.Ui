// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { DataClientImportService } from './data-client-import.service';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import {
  CLIENT_IMPORT_DEFAULT_POLICY,
} from 'src/app/domain/constants/client-import.constants';
import {
  ClientImportDateFormat,
  ClientImportNameOrder,
  ClientImportTarget,
} from 'src/app/domain/enums/client-import.enums';
import { IClientImportRequest } from 'src/app/domain/models/client-import/i-client-import-request';
import { IClientImportTemplateFile } from 'src/app/domain/models/client-import/i-client-import-template-file';

describe('DataClientImportService', () => {
  let service: DataClientImportService;
  let httpMock: HttpTestingController;
  const base = `${environment.baseUrl}ClientImport`;

  const request: IClientImportRequest = {
    token: 'token-1',
    fileName: 'staff.csv',
    columns: [{ index: 0, header: 'Name', samples: ['Muster'] }],
    rows: [['Muster']],
    mapping: [{ columnIndex: 0, target: ClientImportTarget.LastName, confidence: 1 }],
    dateFormat: ClientImportDateFormat.DayMonthYear,
    nameOrder: ClientImportNameOrder.FirstLast,
    policy: { ...CLIENT_IMPORT_DEFAULT_POLICY, entryDate: '2026-10-01' },
    rowOverrides: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataClientImportService,
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DataClientImportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('uploads the file as multipart form data under the field "file"', () => {
    const file = new File(['a;b'], 'staff.csv', { type: 'text/csv' });

    service.parse(file).subscribe();

    const req = httpMock.expectOne(`${base}/Parse`);
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
    expect(body.has('sheetName')).toBe(false);
    expect(req.request.headers.has('Content-Type')).toBe(false);
    req.flush({});
  });

  it('adds the sheet name to the upload when one is chosen', () => {
    const file = new File(['x'], 'staff.xlsx');

    service.parse(file, 'Team B').subscribe();

    const req = httpMock.expectOne(`${base}/Parse`);
    expect((req.request.body as FormData).get('sheetName')).toBe('Team B');
    req.flush({});
  });

  it('does not retry a failed upload', () => {
    const file = new File(['x'], 'staff.csv');
    let failed = false;

    service.parse(file).subscribe({ error: () => (failed = true) });

    httpMock
      .expectOne(`${base}/Parse`)
      .flush({ code: 'file-empty' }, { status: 400, statusText: 'Bad Request' });
    httpMock.expectNone(`${base}/Parse`);
    expect(failed).toBe(true);
  });

  it('posts the preview request unchanged and without the global spinner', () => {
    service.preview(request).subscribe();

    const req = httpMock.expectOne(`${base}/Preview`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.body.policy.entryDate).toBe('2026-10-01');
    expect(req.request.context.get(SKIP_LOADING)).toBe(true);
    req.flush({ rows: [], summary: {}, unmappedColumns: [], ignoredTargets: [] });
  });

  it('posts the commit request exactly once, even when it fails', () => {
    let failed = false;

    service.commit(request).subscribe({ error: () => (failed = true) });

    const req = httpMock.expectOne(`${base}/Commit`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({}, { status: 500, statusText: 'Server Error' });
    httpMock.expectNone(`${base}/Commit`);
    expect(failed).toBe(true);
  });

  it('downloads the template as a blob in the requested language', () => {
    let received: IClientImportTemplateFile | undefined;

    service.downloadTemplate('fr').subscribe((file) => (received = file));

    const req = httpMock.expectOne((r) => r.url === `${base}/Template`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('language')).toBe('fr');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['xlsx']));
    expect(received?.blob).toBeInstanceOf(Blob);
  });

  it('builds the file name like the backend when the Content-Disposition header is not readable', () => {
    let received: IClientImportTemplateFile | undefined;

    service.downloadTemplate('zh-CN').subscribe((file) => (received = file));

    httpMock.expectOne((r) => r.url === `${base}/Template`).flush(new Blob(['xlsx']));
    expect(received?.fileName).toBe('klacks-employee-import-zh-CN.xlsx');
  });

  it('takes the file name from the Content-Disposition header when the browser exposes it', () => {
    let received: IClientImportTemplateFile | undefined;

    service.downloadTemplate('de').subscribe((file) => (received = file));

    httpMock.expectOne((r) => r.url === `${base}/Template`).flush(new Blob(['xlsx']), {
      headers: { 'content-disposition': 'attachment; filename="klacks-employee-import-de.xlsx"' },
    });
    expect(received?.fileName).toBe('klacks-employee-import-de.xlsx');
  });
});
