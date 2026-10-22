// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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

  it('should provide the state list ascending by state code', () => {
    localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');

    const service = TestBed.inject(ClientConfigService);
    const unsorted = ['BL', 'BS', 'FR', 'ZH', 'BE', 'AG'].map((state) => ({ state, country: 'CH' }));
    httpMock.match(() => true).forEach((req) => {
      req.flush(req.request.url.includes('GetStateTokenList') ? unsorted : []);
    });

    expect(service.stateList().map((s) => s.state)).toEqual(['AG', 'BE', 'BL', 'BS', 'FR', 'ZH']);
  });
});
