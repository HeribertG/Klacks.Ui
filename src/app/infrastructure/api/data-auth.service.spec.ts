// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for DataAuthService: single-flight refresh, the one-time migration of a refresh token left in localStorage,
 * and the credentials/CSRF header on every cookie call.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { DataAuthService } from './data-auth.service';
import { environment } from 'src/environments/environment';
import { MyToken } from 'src/app/domain/models/my-token-class';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { SessionRenewalOutcome } from 'src/app/domain/enums/session-renewal-outcome.enum';
import { X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE } from 'src/app/domain/constants/auth-request.constants';

const REFRESH_URL = `${environment.baseUrl}Accounts/RefreshToken`;
const LOGIN_URL = `${environment.baseUrl}Accounts/LoginUser`;
const LOGOUT_URL = `${environment.baseUrl}Accounts/Logout`;

function createToken(jwt: string): MyToken {
  const token = new MyToken();
  token.token = jwt;
  token.expTime = new Date();
  return token;
}

function expectCredentialed(req: TestRequest): void {
  expect(req.request.withCredentials).toBe(true);
  expect(req.request.headers.get(X_REQUESTED_WITH_HEADER)).toBe(X_REQUESTED_WITH_VALUE);
}

describe('DataAuthService', () => {
  let service: DataAuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataAuthService],
    });
    service = TestBed.inject(DataAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('shares one in-flight refresh across concurrent callers', () => {
    const results: MyToken[] = [];

    service.refreshToken().subscribe((t) => results.push(t));
    service.refreshToken().subscribe((t) => results.push(t));

    const req = httpMock.expectOne(REFRESH_URL);
    expect(req.request.method).toBe('POST');
    const token = createToken('jwt');
    req.flush(token);

    expect(results).toEqual([token, token]);
  });

  it('issues a fresh request once the previous refresh completed', () => {
    service.refreshToken().subscribe();
    httpMock.expectOne(REFRESH_URL).flush(createToken('jwt-1'));

    service.refreshToken().subscribe();
    httpMock.expectOne(REFRESH_URL).flush(createToken('jwt-2'));
  });

  it('sends the refresh with credentials, the CSRF header and no refresh token in the body', () => {
    service.refreshToken().subscribe();

    const req = httpMock.expectOne(REFRESH_URL);
    expectCredentialed(req);
    expect(req.request.body).toEqual({});
    req.flush(createToken('jwt'));
  });

  describe('migration of a refresh token left in localStorage', () => {
    it('sends the legacy refresh token once in the body and drops it after success', () => {
      localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy-rt');

      service.refreshToken().subscribe();
      const req = httpMock.expectOne(REFRESH_URL);
      expect(req.request.body).toEqual({ refreshToken: 'legacy-rt' });
      expectCredentialed(req);
      req.flush(createToken('jwt'));

      expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();

      service.refreshToken().subscribe();
      const next = httpMock.expectOne(REFRESH_URL);
      expect(next.request.body).toEqual({});
      next.flush(createToken('jwt-2'));
    });

    it('drops a rejected legacy token without a second call', () => {
      localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'dead-rt');
      let failed = false;

      service.refreshToken().subscribe({ error: () => (failed = true) });
      httpMock.expectOne(REFRESH_URL).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(failed).toBe(true);
      expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();
      httpMock.expectNone(REFRESH_URL);
    });

    it('keeps the legacy token when the backend is unreachable so the next start can migrate it', () => {
      localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy-rt');
      let failed = false;

      service.refreshToken().subscribe({ error: () => (failed = true) });
      httpMock.expectOne(REFRESH_URL).flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });

      expect(failed).toBe(true);
      expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBe('legacy-rt');
    });
  });

  it('logs in with credentials and the CSRF header so the refresh cookie is stored', () => {
    service.login({ email: 'a@b.c', password: 'pw' }).subscribe();

    const req = httpMock.expectOne(LOGIN_URL);
    expectCredentialed(req);
    req.flush(createToken('jwt'));
  });

  it('logs out with credentials and the CSRF header so the refresh cookie is revoked and cleared', () => {
    service.logout().subscribe();

    const req = httpMock.expectOne(LOGOUT_URL);
    expect(req.request.method).toBe('POST');
    expectCredentialed(req);
    req.flush(null);
  });

  describe('logout retry', () => {
    const transientFailures = [
      { status: 503, statusText: 'Service Unavailable' },
      { status: 429, statusText: 'Too Many Requests' },
    ];

    for (const failure of transientFailures) {
      it('repeats a logout that failed with ' + failure.status + ' exactly once', () => {
        let failed = false;
        service.logout().subscribe({ error: () => (failed = true) });

        httpMock.expectOne(LOGOUT_URL).flush(null, failure);
        httpMock.expectOne(LOGOUT_URL).flush(null, failure);

        httpMock.expectNone(LOGOUT_URL);
        expect(failed).toBe(true);
      });
    }

    it('repeats a logout that hit a network error exactly once', () => {
      let failed = false;
      service.logout().subscribe({ error: () => (failed = true) });

      httpMock.expectOne(LOGOUT_URL).error(new ProgressEvent('error'));
      httpMock.expectOne(LOGOUT_URL).error(new ProgressEvent('error'));

      httpMock.expectNone(LOGOUT_URL);
      expect(failed).toBe(true);
    });

    it('succeeds when the repeated logout succeeds', () => {
      let completed = false;
      service.logout().subscribe({ complete: () => (completed = true) });

      httpMock.expectOne(LOGOUT_URL).flush(null, { status: 502, statusText: 'Bad Gateway' });
      httpMock.expectOne(LOGOUT_URL).flush(null);

      expect(completed).toBe(true);
    });

    it('does not repeat a logout the server refused with 400 or 401', () => {
      service.logout().subscribe({ error: () => undefined });
      httpMock.expectOne(LOGOUT_URL).flush(null, { status: 401, statusText: 'Unauthorized' });
      httpMock.expectNone(LOGOUT_URL);

      service.logout().subscribe({ error: () => undefined });
      httpMock.expectOne(LOGOUT_URL).flush(null, { status: 400, statusText: 'Bad Request' });
      httpMock.expectNone(LOGOUT_URL);
    });
  });

  describe('renewSession()', () => {
    it('reports Rejected without a request when the tab holds no local session', async () => {
      expect(await service.renewSession()).toBe(SessionRenewalOutcome.Rejected);
      httpMock.expectNone(REFRESH_URL);
    });

    it('reports Renewed and records the new access-token expiry', async () => {
      localStorage.setItem(StorageKeys.TOKEN_USERID, 'user-1');
      const expiry = new Date(Date.now() + 900_000).toISOString();

      const outcome = service.renewSession();
      const req = httpMock.expectOne(REFRESH_URL);
      expectCredentialed(req);
      req.flush({ ...createToken('jwt'), expTime: expiry });

      expect(await outcome).toBe(SessionRenewalOutcome.Renewed);
      expect(localStorage.getItem(StorageKeys.TOKEN_EXP)).toBe(expiry);
      expect(localStorage.getItem(StorageKeys.LEGACY_ACCESS_TOKEN)).toBeNull();
    });

    it('reports Rejected on 401 and Unavailable on a server error', async () => {
      localStorage.setItem(StorageKeys.TOKEN_USERID, 'user-1');

      const rejected = service.renewSession();
      httpMock.expectOne(REFRESH_URL).flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(await rejected).toBe(SessionRenewalOutcome.Rejected);

      const unavailable = service.renewSession();
      httpMock.expectOne(REFRESH_URL).flush(null, { status: 503, statusText: 'Service Unavailable' });
      expect(await unavailable).toBe(SessionRenewalOutcome.Unavailable);
    });
  });
});
