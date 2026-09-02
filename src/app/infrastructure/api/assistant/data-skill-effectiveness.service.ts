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
import { SKILL_EFFECTIVENESS_DEFAULT_DAYS } from 'src/app/domain/constants/skill-effectiveness.constants';

@Injectable({
  providedIn: 'root',
})
export class DataSkillEffectivenessService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`
  }eval/`;

  /**
   * Loads the scorecard for a reporting window.
   * @param days - Length of the window in days; the backend answers 400 outside 1..365
   */
  getSkillEffectiveness(
    days: number = SKILL_EFFECTIVENESS_DEFAULT_DAYS,
  ): Observable<ISkillEffectivenessResource> {
    return this.httpClient
      .get<ISkillEffectivenessResource>(`${this.baseUrl}skill-effectiveness`, {
        params: { days: days.toString() },
      })
      .pipe(retry(3));
  }
}
