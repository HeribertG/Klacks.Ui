import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IAgent } from 'src/app/domain/interfaces/agent.interface';
import { IAgentMemory, ICreateMemoryRequest, IUpdateMemoryRequest } from 'src/app/domain/interfaces/agent-memory.interface';
import { ICreateAgentRequest, IUpdateAgentRequest } from 'src/app/domain/interfaces/agent-request.interface';
import { IAgentSession, IAgentSessionMessage } from 'src/app/domain/interfaces/agent-session.interface';
import { IAgentSkillSummary } from 'src/app/domain/interfaces/agent-skill.interface';
import { IAgentSoulSection, IAgentSoulHistory, IUpsertSoulRequest } from 'src/app/domain/interfaces/agent-soul.interface';

@Injectable({
  providedIn: 'root',
})
export class DataAgentService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}assistant/agents`;

  getAll(): Observable<IAgent[]> {
    return this.httpClient.get<IAgent[]>(this.baseUrl).pipe(retry(3));
  }

  getById(id: string): Observable<IAgent> {
    return this.httpClient
      .get<IAgent>(`${this.baseUrl}/${id}`)
      .pipe(retry(3));
  }

  create(request: ICreateAgentRequest): Observable<{ id: string; name: string }> {
    return this.httpClient
      .post<{ id: string; name: string }>(this.baseUrl, request)
      .pipe(retry(3));
  }

  update(
    id: string,
    request: IUpdateAgentRequest,
  ): Observable<IAgent> {
    return this.httpClient
      .put<IAgent>(`${this.baseUrl}/${id}`, request)
      .pipe(retry(3));
  }

  getSoulSections(agentId: string): Observable<IAgentSoulSection[]> {
    return this.httpClient
      .get<IAgentSoulSection[]>(`${this.baseUrl}/${agentId}/soul`)
      .pipe(retry(3));
  }

  upsertSoulSection(
    agentId: string,
    sectionType: string,
    request: IUpsertSoulRequest,
  ): Observable<{ agentId: string; sectionType: string }> {
    return this.httpClient
      .put<{ agentId: string; sectionType: string }>(
        `${this.baseUrl}/${agentId}/soul/${sectionType}`,
        request,
      )
      .pipe(retry(3));
  }

  deactivateSoulSection(
    agentId: string,
    sectionType: string,
  ): Observable<void> {
    return this.httpClient
      .delete<void>(`${this.baseUrl}/${agentId}/soul/${sectionType}`)
      .pipe(retry(3));
  }

  getSoulHistory(
    agentId: string,
    limit = 50,
  ): Observable<IAgentSoulHistory[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.httpClient
      .get<IAgentSoulHistory[]>(
        `${this.baseUrl}/${agentId}/soul/history`,
        { params },
      )
      .pipe(retry(3));
  }

  getMemories(
    agentId: string,
    search?: string,
    category?: string,
  ): Observable<IAgentMemory[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category);

    return this.httpClient
      .get<IAgentMemory[]>(`${this.baseUrl}/${agentId}/memories`, {
        params,
      })
      .pipe(retry(3));
  }

  createMemory(
    agentId: string,
    request: ICreateMemoryRequest,
  ): Observable<IAgentMemory> {
    return this.httpClient
      .post<IAgentMemory>(
        `${this.baseUrl}/${agentId}/memories`,
        request,
      )
      .pipe(retry(3));
  }

  updateMemory(
    agentId: string,
    memoryId: string,
    request: IUpdateMemoryRequest,
  ): Observable<IAgentMemory> {
    return this.httpClient
      .put<IAgentMemory>(
        `${this.baseUrl}/${agentId}/memories/${memoryId}`,
        request,
      )
      .pipe(retry(3));
  }

  deleteMemory(agentId: string, memoryId: string): Observable<void> {
    return this.httpClient
      .delete<void>(
        `${this.baseUrl}/${agentId}/memories/${memoryId}`,
      )
      .pipe(retry(3));
  }

  togglePin(
    agentId: string,
    memoryId: string,
  ): Observable<{ id: string; isPinned: boolean }> {
    return this.httpClient
      .post<{ id: string; isPinned: boolean }>(
        `${this.baseUrl}/${agentId}/memories/${memoryId}/pin`,
        {},
      )
      .pipe(retry(3));
  }

  getSkills(agentId: string): Observable<IAgentSkillSummary[]> {
    return this.httpClient
      .get<IAgentSkillSummary[]>(`${this.baseUrl}/${agentId}/skills`)
      .pipe(retry(3));
  }

  getSessions(agentId: string): Observable<IAgentSession[]> {
    return this.httpClient
      .get<IAgentSession[]>(`${this.baseUrl}/${agentId}/sessions`)
      .pipe(retry(3));
  }

  getSessionMessages(
    agentId: string,
    sessionId: string,
  ): Observable<IAgentSessionMessage[]> {
    return this.httpClient
      .get<IAgentSessionMessage[]>(
        `${this.baseUrl}/${agentId}/sessions/${sessionId}`,
      )
      .pipe(retry(3));
  }
}
