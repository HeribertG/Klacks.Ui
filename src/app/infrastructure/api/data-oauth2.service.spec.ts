// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataOAuth2Service } from './data-oauth2.service';
import { environment } from 'src/environments/environment';
import { X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE } from 'src/app/domain/constants/auth-request.constants';

describe('DataOAuth2Service', () => {
  let service: DataOAuth2Service;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(DataOAuth2Service);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends the callback with credentials and the CSRF header so the refresh cookie is stored', () => {
    service.callback({ code: 'code', state: 'google_nonce', redirectUri: 'http://localhost/cb' }).subscribe();

    const req = httpMock.expectOne(`${environment.baseUrl}OAuth2/callback`);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get(X_REQUESTED_WITH_HEADER)).toBe(X_REQUESTED_WITH_VALUE);
    req.flush({});
  });
});
