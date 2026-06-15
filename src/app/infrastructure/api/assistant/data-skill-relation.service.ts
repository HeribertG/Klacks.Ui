// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the emergent skill-relationship graph Klacksy has learned.
 * Exposes the admin-only assistant endpoints to list relations and to accept or dismiss a single insight.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ISkillRelation } from 'src/app/domain/models/assistant/skill-relation.interface';

@Injectable({
  providedIn: 'root',
})
export class DataSkillRelationService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  getAll(): Observable<ISkillRelation[]> {
    return this.httpClient
      .get<ISkillRelation[]>(`${this.baseUrl}skill-relations`)
      .pipe(retry(3));
  }

  accept(id: string): Observable<ISkillRelation> {
    return this.httpClient.post<ISkillRelation>(
      `${this.baseUrl}skill-relations/${id}/accept`,
      {},
    );
  }

  dismiss(id: string): Observable<ISkillRelation> {
    return this.httpClient.post<ISkillRelation>(
      `${this.baseUrl}skill-relations/${id}/dismiss`,
      {},
    );
  }
}
