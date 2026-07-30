// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { DataManagementGoalCandidatesService } from './data-management-goal-candidates.service';
import { DataGoalCandidatesService } from 'src/app/infrastructure/api/assistant/data-goal-candidates.service';
import { GOAL_CANDIDATE_DECISION, GOAL_CANDIDATE_STATUS } from 'src/app/domain/constants/goal-candidate.constants';
import { IGoalCandidate } from 'src/app/domain/interfaces/goal-candidate.interface';

describe('DataManagementGoalCandidatesService', () => {
  let service: DataManagementGoalCandidatesService;
  let dataServiceMock: {
    getCandidates: ReturnType<typeof vi.fn>;
    setDecision: ReturnType<typeof vi.fn>;
  };

  const candidateOne: IGoalCandidate = {
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
  };

  const candidateTwo: IGoalCandidate = {
    ...candidateOne,
    id: 'candidate-2',
    title: 'Close the pending scenario for group A',
  };

  beforeEach(() => {
    dataServiceMock = {
      getCandidates: vi.fn().mockReturnValue(of([])),
      setDecision: vi.fn().mockReturnValue(of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        DataManagementGoalCandidatesService,
        { provide: DataGoalCandidatesService, useValue: dataServiceMock },
      ],
    });

    service = TestBed.inject(DataManagementGoalCandidatesService);
  });

  it('starts with an empty candidate list', () => {
    expect(service.candidates()).toEqual([]);
    expect(service.hasCandidates()).toBe(false);
  });

  it('loadCandidates fills the signal from the proposed-status endpoint', () => {
    dataServiceMock.getCandidates.mockReturnValue(of([candidateOne, candidateTwo]));

    service.loadCandidates().subscribe();

    expect(dataServiceMock.getCandidates).toHaveBeenCalledWith(GOAL_CANDIDATE_STATUS.Proposed, 50);
    expect(service.candidates()).toEqual([candidateOne, candidateTwo]);
    expect(service.hasCandidates()).toBe(true);
  });

  it('loadCandidates leaves the previous list untouched on error', () => {
    dataServiceMock.getCandidates.mockReturnValue(of([candidateOne]));
    service.loadCandidates().subscribe();

    dataServiceMock.getCandidates.mockReturnValue(throwError(() => new Error('offline')));
    service.loadCandidates().subscribe({ error: () => undefined });

    expect(service.candidates()).toEqual([candidateOne]);
  });

  it('approve removes the candidate from local state after a successful decision', () => {
    dataServiceMock.getCandidates.mockReturnValue(of([candidateOne, candidateTwo]));
    service.loadCandidates().subscribe();

    service.approve('candidate-1').subscribe();

    expect(dataServiceMock.setDecision).toHaveBeenCalledWith('candidate-1', GOAL_CANDIDATE_DECISION.Approved);
    expect(service.candidates()).toEqual([candidateTwo]);
  });

  it('reject removes the candidate from local state after a successful decision', () => {
    dataServiceMock.getCandidates.mockReturnValue(of([candidateOne, candidateTwo]));
    service.loadCandidates().subscribe();

    service.reject('candidate-2').subscribe();

    expect(dataServiceMock.setDecision).toHaveBeenCalledWith('candidate-2', GOAL_CANDIDATE_DECISION.Rejected);
    expect(service.candidates()).toEqual([candidateOne]);
  });

  it('keeps the candidate in local state when the decision request fails', () => {
    dataServiceMock.getCandidates.mockReturnValue(of([candidateOne]));
    service.loadCandidates().subscribe();

    dataServiceMock.setDecision.mockReturnValue(throwError(() => new Error('offline')));
    let receivedError: unknown;
    service.approve('candidate-1').subscribe({ error: (error) => (receivedError = error) });

    expect(receivedError).toBeDefined();
    expect(service.candidates()).toEqual([candidateOne]);
  });
});
