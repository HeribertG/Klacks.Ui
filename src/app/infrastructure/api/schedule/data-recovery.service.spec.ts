// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { DataRecoveryService, ICoverAbsenceRequest } from './data-recovery.service';

const REQUEST: ICoverAbsenceRequest = {
  clientId: 'client-1',
  date: '2026-10-05',
  groupId: 'group-1',
  absenceId: 'absence-1',
};

describe('DataRecoveryService', () => {
  let service: DataRecoveryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataRecoveryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts the planner language so the server names the scenario in it', async () => {
    const promise = firstValueFrom(service.coverAbsence({ ...REQUEST, language: 'it' }));

    const request = httpMock.expectOne((req) => req.url.endsWith('Recovery/CoverAbsence'));
    expect(request.request.body.language).toBe('it');
    request.flush({ scenarioId: 'scenario-1' });
    await promise;
  });

  it('omits the language when none is given', async () => {
    const promise = firstValueFrom(service.coverAbsence(REQUEST));

    const request = httpMock.expectOne((req) => req.url.endsWith('Recovery/CoverAbsence'));
    expect(request.request.body.language).toBeUndefined();
    request.flush({ scenarioId: 'scenario-1' });
    await promise;
  });
});
