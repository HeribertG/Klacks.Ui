// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the admin-only standing-approval endpoint: lists the advance approvals, grants one
 * and revokes one.
 * @param id - Identifier of the approval to revoke
 * @param request - The finding type, scope, duration and daily budget of a new approval
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IStandingApproval } from 'src/app/domain/models/assistant/standing-approval.interface';
import { IGrantStandingApprovalRequest } from 'src/app/domain/models/assistant/grant-standing-approval-request.interface';

@Injectable({ providedIn: 'root' })
export class DataStandingApprovalService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;
  private readonly endpoint = `${this.baseUrl}proactive-standing-approvals`;

  getAll(): Observable<IStandingApproval[]> {
    return this.httpClient.get<IStandingApproval[]>(this.endpoint).pipe(retry(3));
  }

  grant(request: IGrantStandingApprovalRequest): Observable<IStandingApproval> {
    return this.httpClient.post<IStandingApproval>(this.endpoint, request);
  }

  revoke(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.endpoint}/${id}`);
  }
}
