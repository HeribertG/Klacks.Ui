// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ISpamRule, SpamRuleType } from 'src/app/domain/models/email/spam-rule.model';

const API_PATH = 'ReceivedEmail/SpamRules';

@Injectable({
  providedIn: 'root',
})
export class DataSpamRuleService {
  private httpClient = inject(HttpClient);

  getAll(): Observable<ISpamRule[]> {
    return this.httpClient
      .get<ISpamRule[]>(`${environment.baseUrl}${API_PATH}`)
      .pipe(retry(3));
  }

  create(ruleType: SpamRuleType, pattern: string): Observable<ISpamRule> {
    return this.httpClient
      .post<ISpamRule>(`${environment.baseUrl}${API_PATH}`, { ruleType, pattern })
      .pipe(retry(3));
  }

  update(rule: ISpamRule): Observable<ISpamRule> {
    return this.httpClient
      .put<ISpamRule>(`${environment.baseUrl}${API_PATH}/${rule.id}`, {
        id: rule.id,
        ruleType: rule.ruleType,
        pattern: rule.pattern,
        isActive: rule.isActive,
        sortOrder: rule.sortOrder,
      })
      .pipe(retry(3));
  }

  delete(id: string): Observable<boolean> {
    return this.httpClient
      .delete<boolean>(`${environment.baseUrl}${API_PATH}/${id}`)
      .pipe(retry(3));
  }
}
