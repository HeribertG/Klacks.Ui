// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for Klacksy's self-proposed goal candidates: listing proposed candidates
 * and recording the user's approve/reject decision.
 * @param status - Goal candidate status to filter the listing by (e.g. proposed)
 * @param take - Maximum number of candidates to fetch
 * @param id - Identifier of the goal candidate (Guid)
 * @param decision - Chosen decision value, approved or rejected
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { GoalCandidateDecision, GoalCandidateStatus } from 'src/app/domain/constants/goal-candidate.constants';
import { IGoalCandidate } from 'src/app/domain/interfaces/goal-candidate.interface';

export interface ISetGoalCandidateDecisionRequest {
  decision: GoalCandidateDecision;
}

@Injectable({
  providedIn: 'root',
})
export class DataGoalCandidatesService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  getCandidates(status: GoalCandidateStatus, take: number): Observable<IGoalCandidate[]> {
    const params = new HttpParams()
      .set('status', status)
      .set('take', take);
    return this.httpClient
      .get<IGoalCandidate[]>(
        `${this.baseUrl}goal-candidates`,
        { params, context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(retry(3));
  }

  setDecision(id: string, decision: GoalCandidateDecision): Observable<void> {
    const request: ISetGoalCandidateDecisionRequest = { decision };
    return this.httpClient
      .put<void>(
        `${this.baseUrl}goal-candidates/${id}/decision`,
        request,
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(retry(3));
  }
}
