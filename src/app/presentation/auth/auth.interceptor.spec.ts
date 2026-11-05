// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE } from 'src/app/domain/constants/auth-request.constants';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';

const SELECTED_GROUP_ID = 'group-42';
const TEST_URL = '/api/test';
const CONNECTION_ID = 'connection-7';

function isoInSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

describe('AuthInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let storage: Record<string, string>;
  let groupSelectionConstructed: number;

  beforeEach(() => {
    storage = {};
    groupSelectionConstructed = 0;

    const localStorageSpy = {
      get: vi.fn((key: string) => storage[key] ?? null),
      set: vi.fn((key: string, value: string) => (storage[key] = value)),
      remove: vi.fn((key: string) => delete storage[key]),
    };

    // Stands in for the real service so the spec can count how often the interceptor pulls it out
    // of the injector: on a boot with a dead access cookie that resolve is what drags the whole
    // GroupSelectionService -> DataManagementClient -> ClientConfig chain into existence and fires
    // four authenticated requests that would all 401.
    class GroupSelectionStub {
      constructor() {
        groupSelectionConstructed++;
      }
      get selectedGroupId(): string {
        return SELECTED_GROUP_ID;
      }
    }

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: GroupSelectionService, useClass: GroupSelectionStub },
        { provide: SignalRService, useValue: { connectionId: CONNECTION_ID } },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function signIn(expiresInSeconds: number): void {
    storage[StorageKeys.TOKEN_USERID] = 'user-1';
    storage[StorageKeys.TOKEN_EXP] = isoInSeconds(expiresInSeconds);
  }

  it('sends API requests with credentials and the CSRF header but never an Authorization header', () => {
    signIn(900);

    httpClient.get(TEST_URL).subscribe();

    const req = httpMock.expectOne(TEST_URL);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get(X_REQUESTED_WITH_HEADER)).toBe(X_REQUESTED_WITH_VALUE);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('sends uploads and deletes with credentials and the CSRF header', () => {
    signIn(900);

    httpClient.post(TEST_URL, new FormData()).subscribe();
    httpClient.delete(TEST_URL + '/1').subscribe();

    for (const req of [httpMock.expectOne(TEST_URL), httpMock.expectOne(TEST_URL + '/1')]) {
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get(X_REQUESTED_WITH_HEADER)).toBe(X_REQUESTED_WITH_VALUE);
      req.flush({});
    }
  });

  it('adds the CSRF header even without a local session (login page calls)', () => {
    httpClient.get(TEST_URL).subscribe();

    const req = httpMock.expectOne(TEST_URL);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get(X_REQUESTED_WITH_HEADER)).toBe(X_REQUESTED_WITH_VALUE);
    expect(req.request.headers.get('X-SignalR-ConnectionId')).toBeNull();
    expect(groupSelectionConstructed).toBe(0);
    req.flush({});
  });

  it('attaches the connection id and the selected group while the stored expiry says the access token is valid', () => {
    signIn(900);

    httpClient.get(TEST_URL).subscribe();

    const req = httpMock.expectOne(TEST_URL);
    expect(req.request.headers.get('X-SignalR-ConnectionId')).toBe(CONNECTION_ID);
    expect(req.request.headers.get('X-Selected-Group')).toBe(SELECTED_GROUP_ID);
    expect(groupSelectionConstructed).toBe(1);
    req.flush({});
  });

  it('does not construct the group selection chain while the stored expiry has passed', () => {
    signIn(-60);

    httpClient.get(TEST_URL).subscribe();

    const req = httpMock.expectOne(TEST_URL);
    expect(groupSelectionConstructed).toBe(0);
    expect(req.request.headers.get('X-Selected-Group')).toBeNull();
    req.flush({});
  });

  it('still scopes the request while the access token is inside the expiry buffer but valid', () => {
    signIn(5);

    httpClient.get(TEST_URL).subscribe();

    const req = httpMock.expectOne(TEST_URL);
    expect(req.request.headers.get('X-Selected-Group')).toBe(SELECTED_GROUP_ID);
    req.flush({});
  });

  it('does not touch external requests', () => {
    signIn(900);

    httpClient.get('https://example.com/thing').subscribe();

    const req = httpMock.expectOne('https://example.com/thing');
    expect(req.request.withCredentials).toBe(false);
    expect(req.request.headers.get(X_REQUESTED_WITH_HEADER)).toBeNull();
    expect(req.request.headers.get('X-Instance-Id')).toBeNull();
    req.flush({});
  });

  it('does not send credentials to a foreign host whose path contains /api/', () => {
    signIn(900);
    const foreignUrl = 'https://foreign.example.test/api/backend/thing';

    httpClient.get(foreignUrl).subscribe();

    const req = httpMock.expectOne(foreignUrl);
    expect(req.request.withCredentials).toBe(false);
    expect(req.request.headers.get(X_REQUESTED_WITH_HEADER)).toBeNull();
    req.flush({});
  });
});
