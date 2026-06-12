// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { DataPersonalAccessTokenService } from './data-personal-access-token.service';

describe('DataPersonalAccessTokenService', () => {
  let service: DataPersonalAccessTokenService;
  let httpMock: HttpTestingController;
  const base = `${environment.baseUrl}personal-access-tokens`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataPersonalAccessTokenService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DataPersonalAccessTokenService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches the token list', () => {
    const tokens = [
      {
        id: '1',
        name: 'CI Pipeline',
        tokenPrefix: 'pat_abc1',
        createdAt: '2026-06-01T08:00:00Z',
        expiresAt: '2027-06-01T08:00:00Z',
        lastUsedAt: null,
      },
    ];

    service.getTokenList().subscribe((list) => {
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('CI Pipeline');
      expect(list[0].tokenPrefix).toBe('pat_abc1');
    });

    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush(tokens);
  });

  it('creates a token via POST and returns the plaintext token once', () => {
    const created = {
      id: '3',
      name: 'New Token',
      tokenPrefix: 'pat_ghi3',
      expiresAt: '2027-06-12T08:00:00Z',
      token: 'pat_ghi3_full_plaintext_secret_value',
    };

    service.createToken({ name: 'New Token', expiresInDays: 365 }).subscribe((result) => {
      expect(result.token).toBe(created.token);
      expect(result.tokenPrefix).toBe('pat_ghi3');
    });

    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'New Token', expiresInDays: 365 });
    req.flush(created);
  });

  it('creates a token without expiry so the server default applies', () => {
    service.createToken({ name: 'Default Expiry' }).subscribe();

    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Default Expiry' });
    req.flush({
      id: '4',
      name: 'Default Expiry',
      tokenPrefix: 'pat_jkl4',
      expiresAt: '2027-06-12T08:00:00Z',
      token: 'pat_jkl4_secret',
    });
  });

  it('revokes a token via DELETE', () => {
    service.revokeToken('1').subscribe();

    const req = httpMock.expectOne(`${base}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});
