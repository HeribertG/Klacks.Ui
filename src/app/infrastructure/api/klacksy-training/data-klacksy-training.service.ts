// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the Klacksy training admin API.
 * @param base - base URL derived from environment, pointing to api/admin/klacksy-training
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiRootUrl } from 'src/app/infrastructure/helpers/api-root-url.helper';

export interface NavigationTargetDto {
  targetId: string;
  route: string;
  labelKey: string;
  category?: string;
  synonyms: Record<string, string[]>;
  synonymStatus: string;
  obsolete: boolean;
}

export interface NavigationFeedbackDto {
  id: string;
  utterance: string;
  locale: string;
  matchedTargetId?: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class DataKlacksyTrainingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${getApiRootUrl()}admin/klacksy-training`;

  listTargets(status?: string, locale?: string): Observable<NavigationTargetDto[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    if (locale) params['locale'] = locale;
    return this.http.get<NavigationTargetDto[]>(`${this.base}/targets`, { params });
  }

  updateSynonyms(targetId: string, locale: string, synonyms: string[], status: string): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/targets/${targetId}/synonyms`, { locale, synonyms, status });
  }

  listFeedback(locale: string, take = 50): Observable<NavigationFeedbackDto[]> {
    return this.http.get<NavigationFeedbackDto[]>(`${this.base}/feedback`, { params: { locale, take: String(take) } });
  }
}
