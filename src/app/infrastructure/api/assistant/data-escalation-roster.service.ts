// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for a group's escalation call list (admin reorder UI).
 * @param groupId - Any group id in the target group's subtree; the backend resolves it to its root
 * @param orderedUserIds - The full desired call order, first stage first
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IEscalationRosterEntry } from 'src/app/domain/interfaces/escalation-roster.interface';

@Injectable({
  providedIn: 'root',
})
export class DataEscalationRosterService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  getRoster(groupId: string): Observable<IEscalationRosterEntry[]> {
    const params = new HttpParams().set('groupId', groupId);
    return this.httpClient.get<IEscalationRosterEntry[]>(
      `${this.baseUrl}escalation-roster`,
      { params },
    );
  }

  setOrder(groupId: string, orderedUserIds: string[]): Observable<void> {
    return this.httpClient.put<void>(`${this.baseUrl}escalation-roster`, {
      groupId,
      orderedUserIds,
    });
  }
}
