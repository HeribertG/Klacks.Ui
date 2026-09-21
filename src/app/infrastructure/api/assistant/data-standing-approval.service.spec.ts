// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataStandingApprovalService } from './data-standing-approval.service';
import { environment } from 'src/environments/environment';

describe('DataStandingApprovalService', () => {
  let service: DataStandingApprovalService;
  let http: HttpTestingController;
  const endpoint = `${environment.baseAssistantUrl || `${environment.baseUrl}assistant/`}proactive-standing-approvals`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataStandingApprovalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists approvals with GET', () => {
    service.getAll().subscribe();
    const req = http.expectOne(endpoint);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('grants with POST and the request body', () => {
    const body = { triggerKind: 'unstaffed_shift', groupId: null, durationDays: 30, dailyBudget: 20 };
    service.grant(body).subscribe();
    const req = http.expectOne(endpoint);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('revokes with DELETE on the id', () => {
    service.revoke('abc').subscribe();
    const req = http.expectOne(`${endpoint}/abc`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
