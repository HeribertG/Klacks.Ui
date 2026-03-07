// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IGroupTree } from 'src/app/domain/models/group/group-class';
import { IClientLocationResource } from 'src/app/domain/models/dashboard-class';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';

@Injectable({
  providedIn: 'root',
})
export class DataDashboardService {
  private httpClient = inject(HttpClient);

  getClientsOverviewData(): Observable<IGroupTree> {
    return this.httpClient
      .get<IGroupTree>(`${environment.baseUrl}Groups/tree`, {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(retry(3));
  }

  getClientsLocationsData(): Observable<IClientLocationResource[]> {
    return this.httpClient
      .get<IClientLocationResource[]>(`${environment.baseUrl}Dashboard/ClientLocations`, {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(retry(3));
  }
}
