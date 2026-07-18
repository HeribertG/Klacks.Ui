// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the RestrictedTimeWindowRule backend collection endpoint.
 * Exposes list, get-by-id, create, update and delete against
 * `${environment.baseUrl}restrictedtimewindowrules`.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IRestrictedTimeWindowRule } from 'src/app/domain/models/scheduling/restricted-time-window-rule.model';

@Injectable({
  providedIn: 'root'
})
export class RestrictedTimeWindowRuleApiService {
  private http = inject(HttpClient);

  getAll(page = 0, pageSize = 1000): Promise<IRestrictedTimeWindowRule[]> {
    return firstValueFrom(this.http.get<IRestrictedTimeWindowRule[]>(`${environment.baseUrl}restrictedtimewindowrules?page=${page}&pageSize=${pageSize}`).pipe(retry(3)));
  }

  getById(id: string): Promise<IRestrictedTimeWindowRule> {
    return firstValueFrom(this.http.get<IRestrictedTimeWindowRule>(`${environment.baseUrl}restrictedtimewindowrules/${id}`).pipe(retry(3)));
  }

  create(rule: IRestrictedTimeWindowRule): Promise<IRestrictedTimeWindowRule> {
    const { id: _id, ...payload } = rule;
    return firstValueFrom(this.http.post<IRestrictedTimeWindowRule>(`${environment.baseUrl}restrictedtimewindowrules`, payload).pipe(retry(3)));
  }

  update(rule: IRestrictedTimeWindowRule): Promise<IRestrictedTimeWindowRule> {
    return firstValueFrom(this.http.put<IRestrictedTimeWindowRule>(`${environment.baseUrl}restrictedtimewindowrules`, rule).pipe(retry(3)));
  }

  delete(id: string): Promise<IRestrictedTimeWindowRule> {
    return firstValueFrom(this.http.delete<IRestrictedTimeWindowRule>(`${environment.baseUrl}restrictedtimewindowrules/${id}`).pipe(retry(3)));
  }
}
