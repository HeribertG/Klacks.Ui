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
import { ReplacementRequestOutcome } from 'src/app/domain/enums/replacement-request-outcome.enum';
import { IReplacementCandidatesQuery } from 'src/app/domain/interfaces/replacement-candidates-query.interface';
import { IReplacementCandidatesResult } from 'src/app/domain/interfaces/replacement-candidates-result.interface';
import { IReplacementRequest } from 'src/app/domain/interfaces/replacement-request.interface';
import { IRecordReplacementRequest } from 'src/app/domain/interfaces/record-replacement-request.interface';
import { ICoverAbsenceRequest } from '../../../domain/models/schedule/cover-absence-request.interface';
import { ICoverAbsenceOutcome } from '../../../domain/models/schedule/cover-absence-outcome.interface';
import { IReplacementRequestsQuery } from 'src/app/domain/interfaces/replacement-requests-query.interface';

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
