// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ClientConfigService } from './client-config.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

describe('ClientConfigService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    httpMock.verify();
  });

  it('should not fetch config data on construction when no auth token is stored', () => {
    TestBed.inject(ClientConfigService);

    httpMock.expectNone(() => true);
  });

  it('should fetch config data on construction when an auth token is stored', () => {
    localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');

    const service = TestBed.inject(ClientConfigService);

    expect(service.isInit()).toBe(false);
    httpMock.match(() => true).forEach((req) => req.flush([]));
  });
});
