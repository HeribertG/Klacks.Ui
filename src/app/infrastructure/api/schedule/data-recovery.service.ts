// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the reactive recovery flow (propose-only). Posts a single-day absence to cover and
 * returns the created scenario plus the covered/uncovered slots for human review. Never accepts the scenario.
 * @param apiBase - API base pointing at the Recovery controller (api/backend/Recovery)
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ICoverAbsenceRequest {
  clientId: string;
  date: string;
  groupId: string;
  absenceId: string;
}

export interface ICoveredSlot {
  shiftId: string;
  date: string;
  replacementClientId: string;
  replacementName: string;
}

export interface IUncoveredSlot {
  shiftId: string;
  date: string;
  reason: string;
}

export interface ICoverAbsenceOutcome {
  scenarioId: string;
  token: string;
  scenarioName: string;
  covered: ICoveredSlot[];
  uncovered: IUncoveredSlot[];
}

@Injectable({ providedIn: 'root' })
export class DataRecoveryService {
  private httpClient = inject(HttpClient);
  private apiBase = `${environment.baseUrl}Recovery`;

  coverAbsence(request: ICoverAbsenceRequest): Observable<ICoverAbsenceOutcome> {
    return this.httpClient.post<ICoverAbsenceOutcome>(`${this.apiBase}/CoverAbsence`, request);
  }
}
