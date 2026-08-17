// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for a root group's escalation call list (admin card, read-only).
 * @param groupId - Any group id in the target group's subtree; the backend resolves it to its root
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  getRoster(groupId: string): Observable<IEscalationRosterMember[]> {
    const params = new HttpParams().set('groupId', groupId);
    return this.httpClient.get<IEscalationRosterMember[]>(
      `${this.baseUrl}escalation-roster`,
      { params },
    );
  }
}
