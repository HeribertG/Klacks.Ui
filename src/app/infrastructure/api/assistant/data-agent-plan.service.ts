// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the Klacksy AgentPlans REST endpoints (Phase 3 autonomy roadmap).
 * Talks to /api/backend/assistant/plans: create+start, approve, list, get-by-id.
 * @param baseUrl - Resolved from environment.baseAssistantUrl or baseUrl + assistant
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IAgentPlan } from 'src/app/domain/models/assistant/agent-plan.interface';

export interface ICreatePlanRequest {
  goal: string;
  sessionId?: string;
}

@Injectable({ providedIn: 'root' })
export class DataAgentPlanService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  createAndStart(request: ICreatePlanRequest): Observable<IAgentPlan> {
    return this.http.post<IAgentPlan>(`${this.baseUrl}plans`, request);
  }

  approve(planId: string): Observable<IAgentPlan> {
    return this.http.post<IAgentPlan>(`${this.baseUrl}plans/${planId}/approve`, {});
  }

  listMyPlans(): Observable<IAgentPlan[]> {
    return this.http.get<IAgentPlan[]>(`${this.baseUrl}plans`);
  }

  getPlan(planId: string): Observable<IAgentPlan> {
    return this.http.get<IAgentPlan>(`${this.baseUrl}plans/${planId}`);
  }
}
