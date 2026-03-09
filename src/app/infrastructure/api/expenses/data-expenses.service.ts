// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ExpensesRequest, ExpensesResource } from 'src/app/domain/models/expenses/expenses';

@Injectable({
  providedIn: 'root',
})
export class DataExpensesService {
  private httpClient = inject(HttpClient);

  create(request: ExpensesRequest): Observable<ExpensesResource> {
    return this.httpClient.post<ExpensesResource>(`${environment.baseUrl}Expenses`, request);
  }

  update(resource: ExpensesResource): Observable<ExpensesResource> {
    return this.httpClient.put<ExpensesResource>(`${environment.baseUrl}Expenses`, resource);
  }

  delete(id: string): Observable<ExpensesResource> {
    return this.httpClient.delete<ExpensesResource>(`${environment.baseUrl}Expenses/${id}`);
  }

  get(id: string): Observable<ExpensesResource> {
    return this.httpClient.get<ExpensesResource>(`${environment.baseUrl}Expenses/${id}`).pipe(retry(3));
  }
}
