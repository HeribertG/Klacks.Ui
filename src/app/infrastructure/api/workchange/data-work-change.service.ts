// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { WorkChangeRequest } from 'src/app/domain/models/workchange/work-change';
import { WorkChangeResource } from 'src/app/domain/models/workchange/work-change-resource.interface';
import { idempotentRequestOptions } from 'src/app/infrastructure/helpers/idempotency-key.helper';
import { IdenticalCreateGuardService } from 'src/app/infrastructure/helpers/identical-create-guard.service';

@Injectable({
  providedIn: 'root',
})
export class DataWorkChangeService {
  private httpClient = inject(HttpClient);
  private identicalCreateGuard = inject(IdenticalCreateGuardService);

  create(request: WorkChangeRequest): Observable<WorkChangeResource> {
    const url = `${environment.baseUrl}Works/Changes`;
    const options = idempotentRequestOptions();
    return this.identicalCreateGuard.run(url, request, () => this.httpClient.post<WorkChangeResource>(url, request, options));
  }

  update(request: WorkChangeResource): Observable<WorkChangeResource> {
    return this.httpClient.put<WorkChangeResource>(`${environment.baseUrl}Works/Changes`, request);
  }

  delete(id: string): Observable<WorkChangeResource> {
    return this.httpClient.delete<WorkChangeResource>(`${environment.baseUrl}Works/Changes/${id}`);
  }

  get(id: string): Observable<WorkChangeResource> {
    return this.httpClient.get<WorkChangeResource>(`${environment.baseUrl}Works/Changes/${id}`).pipe(retry(3));
  }
}
