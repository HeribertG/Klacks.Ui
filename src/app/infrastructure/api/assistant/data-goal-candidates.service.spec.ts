// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DataGoalCandidatesService } from './data-goal-candidates.service';
import { GOAL_CANDIDATE_DECISION, GOAL_CANDIDATE_STATUS } from 'src/app/domain/constants/goal-candidate.constants';
import { IGoalCandidate } from 'src/app/domain/interfaces/goal-candidate.interface';
import { environment } from 'src/environments/environment';

describe('DataGoalCandidatesService', () => {
  let service: DataGoalCandidatesService;
  let httpMock: HttpTestingController;
  let apiUrl: string;

  const mockCandidates: IGoalCandidate[] = [
    {
      id: 'candidate-1',
      goalType: 'target_hours_drift',
      titleKey: 'assistant-chat.goal-candidates.type.targetHoursDrift.title',
      rationaleKey: 'assistant-chat.goal-candidates.type.targetHoursDrift.rationale',
      rationaleParams: { count: '3', days: '7' },
      title: 'Reduce deviations from contractual hours',
      rationale: 'A deviation was reported 3 time(s) in the last 7 days.',
      confidence: 'low',
      signalSource: 'target_hours_drift',
      status: 'proposed',
      createdUtc: '2026-07-24T06:00:00Z',
      decidedUtc: null,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataGoalCandidatesService],
    });
    service = TestBed.inject(DataGoalCandidatesService);
    httpMock = TestBed.inject(HttpTestingController);
    apiUrl = `${environment.baseAssistantUrl}goal-candidates`;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getCandidates queries with status and take', () => {
    service.getCandidates(GOAL_CANDIDATE_STATUS.Proposed, 50).subscribe((items) => {
      expect(items).toEqual(mockCandidates);
    });

    const req = httpMock.expectOne(
      (candidate) =>
        candidate.url === apiUrl &&
        candidate.params.get('status') === GOAL_CANDIDATE_STATUS.Proposed &&
        candidate.params.get('take') === '50',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockCandidates);
  });

  it('setDecision puts the decision to goal-candidates/{id}/decision', () => {
    service.setDecision('candidate-1', GOAL_CANDIDATE_DECISION.Approved).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/candidate-1/decision`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ decision: GOAL_CANDIDATE_DECISION.Approved });
    req.flush(null);
  });

  it('getCandidates retries three times on failure', () => {
    let receivedError: unknown;
    service.getCandidates(GOAL_CANDIDATE_STATUS.Proposed, 50).subscribe({
      error: (error) => {
        receivedError = error;
      },
    });

    for (let attempt = 0; attempt < 4; attempt++) {
      const req = httpMock.expectOne((candidate) => candidate.url === apiUrl);
      req.error(new ProgressEvent('error'));
    }
    expect(receivedError).toBeDefined();
  });

  it('setDecision retries three times on failure', () => {
    let receivedError: unknown;
    service.setDecision('candidate-1', GOAL_CANDIDATE_DECISION.Rejected).subscribe({
      error: (error) => {
        receivedError = error;
      },
    });

    for (let attempt = 0; attempt < 4; attempt++) {
      const req = httpMock.expectOne(`${apiUrl}/candidate-1/decision`);
      req.error(new ProgressEvent('error'));
    }
    expect(receivedError).toBeDefined();
  });
});
