// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the admin-only "Skill-Wirksamkeit" scorecard (W6.1). The route hangs below the
 * assistant eval root as "skill-effectiveness".
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ISkillEffectivenessResource } from 'src/app/domain/interfaces/skill-effectiveness.interface';

@Injectable({
  providedIn: 'root',
})
export class DataSkillEffectivenessService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`
  }eval/`;

  getSkillEffectiveness(): Observable<ISkillEffectivenessResource> {
    return this.httpClient
      .get<ISkillEffectivenessResource>(`${this.baseUrl}skill-effectiveness`)
      .pipe(retry(3));
  }
}
