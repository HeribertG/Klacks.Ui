// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the escalation roster: reads the flat, group-agnostic admin member list and
 * persists the admin's drag'n'drop wake-up order.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IEscalationRosterMember } from 'src/app/domain/interfaces/escalation-roster.interface';

@Injectable({
  providedIn: 'root',
})
export class DataEscalationRosterService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  getRoster(): Observable<IEscalationRosterMember[]> {
    return this.httpClient.get<IEscalationRosterMember[]>(
      `${this.baseUrl}escalation-roster`,
    );
  }

  reorderRoster(orderedUserIds: string[]): Observable<unknown> {
    return this.httpClient.put(`${this.baseUrl}escalation-roster/Reorder`, {
      orderedUserIds,
    });
  }
}
