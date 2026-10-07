// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
  /**
   * Wake the group's escalation roster (planner call list) for the affected shifts. Off when the planner
   * handles the absence interactively; the backend defaults to on for unattended callers (skill/MCP).
   */
  notifyEscalationRoster?: boolean;
  /** The planner's language; the server writes the scenario name in it, falling back to the installation language. */
  language?: string;
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

@Injectable({ providedIn: 'root' })
export class DataRecoveryService {
  private httpClient = inject(HttpClient);
  private apiBase = `${environment.baseUrl}Recovery`;

  coverAbsence(request: ICoverAbsenceRequest): Observable<ICoverAbsenceOutcome> {
    return this.httpClient.post<ICoverAbsenceOutcome>(`${this.apiBase}/CoverAbsence`, request);
  }
}
