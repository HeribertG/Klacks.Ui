// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Infrastructure API service for CounterRule CRUD operations.
 * Talks to the backend controller route `api/backend/CounterRules`.
 * @param http - Angular HttpClient used for all requests.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ICounterRule } from 'src/app/domain/models/scheduling/counter-rule.model';

@Injectable({
  providedIn: 'root',
})
export class CounterRuleApiService {
  private http = inject(HttpClient);

  getAll(page = 0, pageSize = 1000): Promise<ICounterRule[]> {
    return firstValueFrom(this.http.get<ICounterRule[]>(`${environment.baseUrl}counterrules?page=${page}&pageSize=${pageSize}`).pipe(retry(3)));
  }

  getById(id: string): Promise<ICounterRule> {
    return firstValueFrom(this.http.get<ICounterRule>(`${environment.baseUrl}counterrules/${id}`).pipe(retry(3)));
  }

  create(rule: ICounterRule): Promise<ICounterRule> {
    const { id: _id, ...payload } = rule;
    return firstValueFrom(this.http.post<ICounterRule>(`${environment.baseUrl}counterrules`, payload).pipe(retry(3)));
  }

  update(rule: ICounterRule): Promise<ICounterRule> {
    return firstValueFrom(this.http.put<ICounterRule>(`${environment.baseUrl}counterrules`, rule).pipe(retry(3)));
  }

  delete(id: string): Promise<ICounterRule> {
    return firstValueFrom(this.http.delete<ICounterRule>(`${environment.baseUrl}counterrules/${id}`).pipe(retry(3)));
  }
}
