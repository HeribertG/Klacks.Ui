// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';

const SELECTED_GROUP_ID = 'group-42';
const TEST_URL = '/api/test';

function buildToken(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'test', exp: expSeconds }));
  return `${header}.${payload}.signature`;
}

function freshToken(): string {
  return buildToken(Math.floor(Date.now() / 1000) + 900);
}

function expiredToken(): string {
  return buildToken(Math.floor(Date.now() / 1000) - 60);
}

describe('AuthInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let storedToken: string | null;
  let groupSelectionConstructed: number;

  beforeEach(() => {
    storedToken = null;
    groupSelectionConstructed = 0;

    const localStorageSpy = {
      get: vi.fn((key: string) => (key === StorageKeys.TOKEN ? storedToken : null)),
    };

    // Stands in for the real service so the spec can count how often the interceptor pulls it out
    // of the injector: on a boot with a dead token that resolve is what drags the whole
    // GroupSelectionService -> DataManagementClient -> ClientConfig chain into existence and fires
    // four authenticated requests with a token that is already expired.
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
        { provide: SignalRService, useValue: { connectionId: null } },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should attach the selected group header for a valid token', () => {
    storedToken = freshToken();

    httpClient.get(TEST_URL).subscribe();

    const req = httpMock.expectOne(TEST_URL);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${storedToken}`);
    expect(req.request.headers.get('X-Selected-Group')).toBe(SELECTED_GROUP_ID);
    expect(groupSelectionConstructed).toBe(1);
    req.flush({});
  });

  it('should not construct the group selection chain while the stored token is expired', () => {
    storedToken = expiredToken();

    httpClient.get(TEST_URL).subscribe();

    const req = httpMock.expectOne(TEST_URL);
    expect(groupSelectionConstructed).toBe(0);
    expect(req.request.headers.get('X-Selected-Group')).toBeNull();
    req.flush({});
  });

  it('should still send the expired token so the refresh interceptor can replay the request', () => {
    storedToken = expiredToken();

    httpClient.get(TEST_URL).subscribe();

    const req = httpMock.expectOne(TEST_URL);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${storedToken}`);
    req.flush({});
  });

  it('should still scope the request while the token is inside the expiry buffer but valid', () => {
    storedToken = buildToken(Math.floor(Date.now() / 1000) + 5);

    httpClient.get(TEST_URL).subscribe();

    const req = httpMock.expectOne(TEST_URL);
    expect(req.request.headers.get('X-Selected-Group')).toBe(SELECTED_GROUP_ID);
    req.flush({});
  });

  it('should not touch external requests', () => {
    storedToken = freshToken();

    httpClient.get('https://example.com/thing').subscribe();

    const req = httpMock.expectOne('https://example.com/thing');
    expect(req.request.headers.get('Authorization')).toBeNull();
    expect(req.request.headers.get('X-Instance-Id')).toBeNull();
    req.flush({});
  });
});
