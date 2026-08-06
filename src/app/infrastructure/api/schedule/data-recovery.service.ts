// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the reactive recovery flow (propose-only). Posts an absence to cover - one day or a
 * range - and returns the created scenario plus the covered and uncovered slots for human review. It
 * never accepts the scenario; a person decides.
 * @param apiBase - API base pointing at the Recovery controller (api/backend/Recovery)
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IScheduleValidationNotification } from 'src/app/domain/interfaces/schedule-validation-notification.interface';

export interface ICoverAbsenceRequest {
  clientId: string;
  date: string;
  groupId: string;
  absenceId: string;
  /** Last day of a multi-day absence; omit for a single day. */
  untilDate?: string;
  /** Let a supervisor push the proposal through a rule that only blocks in escalation mode. */
  overrideBlock?: boolean;
}

export interface ICoveredSlot {
  shiftId: string;
  date: string;
  replacementClientId: string;
  replacementName: string;
  /** How far the search had to go: 0 is a straight replacement, higher means a swap chain. */
  tier: number;
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
  complianceWarnings: IScheduleValidationNotification[];
  highestTier: number;
}

@Injectable({ providedIn: 'root' })
export class DataRecoveryService {
  private httpClient = inject(HttpClient);
  private apiBase = `${environment.baseUrl}Recovery`;

  coverAbsence(request: ICoverAbsenceRequest): Observable<ICoverAbsenceOutcome> {
    return this.httpClient.post<ICoverAbsenceOutcome>(`${this.apiBase}/CoverAbsence`, request);
  }
}
