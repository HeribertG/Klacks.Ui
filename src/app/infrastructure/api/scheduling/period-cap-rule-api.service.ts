// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Infrastructure API service for PeriodCapRule CRUD operations.
 * Talks to the `periodcaprules` backend controller.
 * @remarks All requests retry up to 3 times and are awaited via firstValueFrom.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IPeriodCapRule } from 'src/app/domain/models/scheduling/period-cap-rule.model';

@Injectable({
  providedIn: 'root',
})
export class PeriodCapRuleApiService {
  private http = inject(HttpClient);

  getAll(page = 0, pageSize = 1000): Promise<IPeriodCapRule[]> {
    return firstValueFrom(
      this.http
        .get<IPeriodCapRule[]>(
          `${environment.baseUrl}periodcaprules?page=${page}&pageSize=${pageSize}`
        )
        .pipe(retry(3))
    );
  }

  getById(id: string): Promise<IPeriodCapRule> {
    return firstValueFrom(
      this.http
        .get<IPeriodCapRule>(`${environment.baseUrl}periodcaprules/${id}`)
        .pipe(retry(3))
    );
  }

  create(rule: IPeriodCapRule): Promise<IPeriodCapRule> {
    const { id: _id, ...payload } = rule;
    return firstValueFrom(
      this.http
        .post<IPeriodCapRule>(`${environment.baseUrl}periodcaprules`, payload)
        .pipe(retry(3))
    );
  }

  update(rule: IPeriodCapRule): Promise<IPeriodCapRule> {
    return firstValueFrom(
      this.http
        .put<IPeriodCapRule>(`${environment.baseUrl}periodcaprules`, rule)
        .pipe(retry(3))
    );
  }

  delete(id: string): Promise<IPeriodCapRule> {
    return firstValueFrom(
      this.http
        .delete<IPeriodCapRule>(`${environment.baseUrl}periodcaprules/${id}`)
        .pipe(retry(3))
    );
  }
}
