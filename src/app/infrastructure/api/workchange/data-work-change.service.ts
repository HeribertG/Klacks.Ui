// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { WorkChangeRequest, WorkChangeResource } from 'src/app/domain/models/workchange/work-change';

@Injectable({
  providedIn: 'root',
})
export class DataWorkChangeService {
  private httpClient = inject(HttpClient);

  create(request: WorkChangeRequest): Observable<WorkChangeResource> {
    return this.httpClient.post<WorkChangeResource>(`${environment.baseUrl}Works/Changes`, request);
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
