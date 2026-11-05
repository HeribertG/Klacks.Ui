// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserAdministrationService } from './user-administration.service';
import { environment } from 'src/environments/environment';
import { ChangePassword } from 'src/app/domain/models/change-password-class';
import { X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE } from 'src/app/domain/constants/auth-request.constants';

describe('UserAdministrationService', () => {
  let service: UserAdministrationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(UserAdministrationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends the password change with credentials and the CSRF header so the renewed refresh cookie is stored', () => {
    service.changePassword(new ChangePassword()).subscribe();

    const req = httpMock.expectOne(`${environment.baseUrl}Accounts/ChangePasswordUser/`);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get(X_REQUESTED_WITH_HEADER)).toBe(X_REQUESTED_WITH_VALUE);
    req.flush({});
  });
});
