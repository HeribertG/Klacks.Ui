// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State + actions for Klacksy's self-proposed goal candidates (Phase 2: approving or
 * rejecting a candidate only changes its status, nothing is planned or executed).
 * Holds the currently proposed candidates as a signal, loads them from the REST endpoint,
 * and removes a candidate from local state once its decision was recorded successfully.
 * @param dataGoalCandidatesService - HTTP API for goal-candidate listing and decisions
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { DataGoalCandidatesService } from 'src/app/infrastructure/api/assistant/data-goal-candidates.service';
import {
  GOAL_CANDIDATE_DECISION,
  GOAL_CANDIDATE_STATUS,
  GoalCandidateDecision,
} from 'src/app/domain/constants/goal-candidate.constants';
import { IGoalCandidate } from 'src/app/domain/interfaces/goal-candidate.interface';

const GOAL_CANDIDATES_TAKE = 50;

@Injectable({ providedIn: 'root' })
export class DataManagementGoalCandidatesService {
  private dataGoalCandidatesService = inject(DataGoalCandidatesService);

  public readonly candidates = signal<IGoalCandidate[]>([]);
  public readonly hasCandidates = computed(() => this.candidates().length > 0);

  loadCandidates(): Observable<IGoalCandidate[]> {
    return this.dataGoalCandidatesService
      .getCandidates(GOAL_CANDIDATE_STATUS.Proposed, GOAL_CANDIDATES_TAKE)
      .pipe(tap((items) => this.candidates.set(items)));
  }

  approve(id: string): Observable<void> {
    return this.decide(id, GOAL_CANDIDATE_DECISION.Approved);
  }

  reject(id: string): Observable<void> {
    return this.decide(id, GOAL_CANDIDATE_DECISION.Rejected);
  }

  private decide(id: string, decision: GoalCandidateDecision): Observable<void> {
    return this.dataGoalCandidatesService
      .setDecision(id, decision)
      .pipe(tap(() => this.candidates.update((items) => items.filter((item) => item.id !== id))));
  }
}
