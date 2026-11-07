// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ExpensesRequest } from 'src/app/domain/models/expenses/expenses';
import { ExpensesResource } from 'src/app/domain/models/expenses/expenses-resource.interface';
import { idempotentRequestOptions } from 'src/app/infrastructure/helpers/idempotency-key.helper';
import { IdenticalCreateGuardService } from 'src/app/infrastructure/helpers/identical-create-guard.service';

@Injectable({
  providedIn: 'root',
})
export class DataExpensesService {
  private httpClient = inject(HttpClient);
  private identicalCreateGuard = inject(IdenticalCreateGuardService);

  create(request: ExpensesRequest): Observable<ExpensesResource> {
    const url = `${environment.baseUrl}Expenses`;
    const options = idempotentRequestOptions();
    return this.identicalCreateGuard.run(url, request, () => this.httpClient.post<ExpensesResource>(url, request, options));
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
