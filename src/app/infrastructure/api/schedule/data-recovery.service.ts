// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * HTTP client for the reactive recovery flow (propose-only). Posts an absence to cover - one day or a
 * range - and returns the created scenario plus the covered and uncovered slots for human review. It
 * never accepts the scenario; a person decides. It also reads alternative stand-ins for a slot and keeps
 * the replacement request book (who was asked, and what they answered).
 * @param apiBase - API base pointing at the Recovery controller (api/backend/Recovery)
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IScheduleValidationNotification } from 'src/app/domain/interfaces/schedule-validation-notification.interface';
import { ReplacementRequestOutcome } from 'src/app/domain/enums/replacement-request-outcome.enum';
import { IReplacementCandidatesQuery } from 'src/app/domain/interfaces/replacement-candidates-query.interface';
import { IReplacementCandidatesResult } from 'src/app/domain/interfaces/replacement-candidates-result.interface';
import { IReplacementRequest } from 'src/app/domain/interfaces/replacement-request.interface';
import { IRecordReplacementRequest } from 'src/app/domain/interfaces/record-replacement-request.interface';
import { IReplacementRequestsQuery } from 'src/app/domain/interfaces/replacement-requests-query.interface';

export interface ICoverAbsenceRequest {
  clientId: string;
  date: string;
  groupId: string;
  absenceId: string;
  /** Last day of a multi-day absence; omit for a single day. */
  untilDate?: string;
  /** Let a supervisor push the proposal through a rule that only blocks in escalation mode. */
  overrideBlock?: boolean;
  /**
   * Wake the group's escalation roster (planner call list) for the affected shifts. Off when the planner
   * handles the absence interactively; the backend defaults to on for unattended callers (skill/MCP).
   */
  notifyEscalationRoster?: boolean;
  /** The planner's language; the server writes the scenario name in it, falling back to the installation language. */
  language?: string;
  /** When the absence was reported (ISO UTC); the server uses "now" when omitted. */
  reportedAtUtc?: string;
}

export interface ICoveredSlot {
  shiftId: string;
  date: string;
  replacementClientId: string;
  replacementName: string;
  /**
   * How far the search had to go: 0 direct in-group replacement, 1 in-group swap, 2 borrowed from
   * another group, 3 swap with another group, 5 on-call person of the own group, 6 on-call person of
   * another group (engine EscalationTier). The value is a label identifier only, never an ordering.
   */
  tier: number;
  /** The cloned work in the scenario the proposal is attached to; absent on older backends. */
  workId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  /** The stored replacement-request row of this proposal; null when nothing was stored. */
  requestId?: string | null;
  /** Mobile number before fixed line of the proposed stand-in. */
  phone?: string | null;
  outcome?: ReplacementRequestOutcome | null;
}

export interface IUncoveredSlot {
  shiftId: string;
  date: string;
  reason: string;
  /** The cloned work in the scenario that stayed open; absent on older backends. */
  workId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface ICoverAbsenceOutcome {
  scenarioId: string;
  token: string;
  scenarioName: string;
  covered: ICoveredSlot[];
  uncovered: IUncoveredSlot[];
  complianceWarnings: IScheduleValidationNotification[];
  highestTier: number;
}

type QueryValue = string | boolean | null | undefined;

@Injectable({ providedIn: 'root' })
export class DataRecoveryService {
  private httpClient = inject(HttpClient);
  private apiBase = `${environment.baseUrl}Recovery`;

  coverAbsence(request: ICoverAbsenceRequest): Observable<ICoverAbsenceOutcome> {
    return this.httpClient.post<ICoverAbsenceOutcome>(`${this.apiBase}/CoverAbsence`, request);
  }

  getCandidates(query: IReplacementCandidatesQuery): Observable<IReplacementCandidatesResult> {
    return this.httpClient.get<IReplacementCandidatesResult>(`${this.apiBase}/Candidates`, {
      params: this.toParams({ ...query }),
    });
  }

  updateRequestOutcome(requestId: string, outcome: ReplacementRequestOutcome): Observable<IReplacementRequest> {
    return this.httpClient.put<IReplacementRequest>(
      `${this.apiBase}/Requests/${encodeURIComponent(requestId)}/Outcome`,
      { outcome },
    );
  }

  recordRequest(request: IRecordReplacementRequest): Observable<IReplacementRequest> {
    return this.httpClient.post<IReplacementRequest>(`${this.apiBase}/Requests`, request);
  }

  getRequests(query: IReplacementRequestsQuery): Observable<IReplacementRequest[]> {
    return this.httpClient.get<IReplacementRequest[]>(`${this.apiBase}/Requests`, {
      params: this.toParams({ ...query }),
    });
  }

  private toParams(values: Record<string, QueryValue>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
