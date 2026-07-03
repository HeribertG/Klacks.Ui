// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { DataErpImportTokenService } from './data-erp-import-token.service';
import { IErpImportToken, IErpImportTokenCreated } from 'src/app/domain/models/settings/erp-import-token';

describe('DataErpImportTokenService', () => {
  let service: DataErpImportTokenService;
  let httpMock: HttpTestingController;
  const base = `${environment.baseUrl}erp-import-tokens`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataErpImportTokenService,
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DataErpImportTokenService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches the token list with dropPointId as query parameter', () => {
    const tokens: IErpImportToken[] = [
      {
        id: 'tok-1',
        dropPointId: 'dp-1',
        name: 'SAP Upload',
        tokenPrefix: 'erp_abc1',
        expiresAt: '2027-07-03T08:00:00Z',
      },
    ];

    service.getTokens('dp-1').subscribe((list) => {
      expect(list.length).toBe(1);
      expect(list[0].tokenPrefix).toBe('erp_abc1');
    });

    const req = httpMock.expectOne(`${base}?dropPointId=dp-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('dropPointId')).toBe('dp-1');
    req.flush(tokens);
  });

  it('creates a token via POST and returns the plaintext token once', () => {
    const created: IErpImportTokenCreated = {
      id: 'tok-2',
      dropPointId: 'dp-1',
      name: 'New Token',
      tokenPrefix: 'erp_def2',
      expiresAt: '2027-07-03T08:00:00Z',
      token: 'erp_def2_full_plaintext_secret_value',
    };

    service.createToken({ dropPointId: 'dp-1', name: 'New Token', expiresInDays: 365 }).subscribe((result) => {
      expect(result.token).toBe(created.token);
      expect(result.tokenPrefix).toBe('erp_def2');
    });

    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ dropPointId: 'dp-1', name: 'New Token', expiresInDays: 365 });
    req.flush(created);
  });

  it('does not retry a failed create request', () => {
    let receivedError: unknown;
    let receivedNext = false;

    service.createToken({ dropPointId: 'dp-1', name: 'Failing Token' }).subscribe({
      next: () => (receivedNext = true),
      error: (error) => (receivedError = error),
    });

    const req = httpMock.expectOne(base);
    req.flush({ message: 'server error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(receivedNext).toBe(false);
    expect(receivedError).toBeDefined();
    httpMock.expectNone(base);
  });

  it('revokes a token via DELETE with dropPointId as query parameter', () => {
    service.revokeToken('tok-1', 'dp-1').subscribe();

    const req = httpMock.expectOne(`${base}/tok-1?dropPointId=dp-1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.get('dropPointId')).toBe('dp-1');
    req.flush({});
  });
});
