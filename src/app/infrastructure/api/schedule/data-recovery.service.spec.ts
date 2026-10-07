// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { DataRecoveryService, ICoverAbsenceRequest } from './data-recovery.service';
import { ReplacementRequestOutcome } from 'src/app/domain/enums/replacement-request-outcome.enum';

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

  it('reads the candidates of a slot with the scenario token and drops empty parameters', async () => {
    const promise = firstValueFrom(
      service.getCandidates({
        shiftId: 'shift-1',
        date: '2026-10-05',
        startTime: '06:00:00',
        endTime: '14:00:00',
        groupId: 'group-1',
        analyseToken: 'token-1',
        overrideBlock: undefined,
      }),
    );

    const request = httpMock.expectOne((req) => req.url.endsWith('Recovery/Candidates'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('shiftId')).toBe('shift-1');
    expect(request.request.params.get('date')).toBe('2026-10-05');
    expect(request.request.params.get('startTime')).toBe('06:00:00');
    expect(request.request.params.get('endTime')).toBe('14:00:00');
    expect(request.request.params.get('groupId')).toBe('group-1');
    expect(request.request.params.get('analyseToken')).toBe('token-1');
    expect(request.request.params.has('overrideBlock')).toBe(false);
    request.flush({ eligible: [], excluded: [] });
    await promise;
  });

  it('puts the response of a stored replacement request', async () => {
    const promise = firstValueFrom(service.updateRequestOutcome('request-1', ReplacementRequestOutcome.Accepted));

    const request = httpMock.expectOne((req) => req.url.endsWith('Recovery/Requests/request-1/Outcome'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ outcome: 'Accepted' });
    request.flush({ id: 'request-1', outcome: 'Accepted' });
    expect((await promise).outcome).toBe(ReplacementRequestOutcome.Accepted);
  });

  it('posts a contact attempt on an alternative candidate', async () => {
    const body = {
      absentClientId: 'client-1',
      candidateClientId: 'client-2',
      shiftId: 'shift-1',
      date: '2026-10-05',
      startTime: '06:00:00',
      endTime: '14:00:00',
      groupId: 'group-1',
      absenceId: 'absence-1',
      analyseToken: 'token-1',
      outcome: ReplacementRequestOutcome.NotReached,
    };
    const promise = firstValueFrom(service.recordRequest(body));

    const request = httpMock.expectOne((req) => req.url.endsWith('Recovery/Requests'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ id: 'request-2', outcome: 'NotReached' });
    await promise;
  });

  it('lists the replacement requests of an absent employee', async () => {
    const promise = firstValueFrom(
      service.getRequests({ absentClientId: 'client-1', fromDate: '2026-10-01', untilDate: '2026-10-07' }),
    );

    const request = httpMock.expectOne((req) => req.url.endsWith('Recovery/Requests'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('absentClientId')).toBe('client-1');
    expect(request.request.params.get('fromDate')).toBe('2026-10-01');
    expect(request.request.params.get('untilDate')).toBe('2026-10-07');
    expect(request.request.params.has('analyseToken')).toBe(false);
    request.flush([]);
    expect(await promise).toEqual([]);
  });
});
