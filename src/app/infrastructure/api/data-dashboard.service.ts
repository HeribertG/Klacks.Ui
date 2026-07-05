// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for fetching dashboard data from the API.
 * @param groupTreeCache$ - Cached observable for the group tree to avoid duplicate requests
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IGroupTree } from 'src/app/domain/models/group/group-class';
import { IClientLocationResource, IShiftCoverageStatistics, IResourceMonitorData, IDashboardVisibilityStatus } from 'src/app/domain/models/dashboard-class';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';

@Injectable({
  providedIn: 'root',
})
export class DataDashboardService {
  private httpClient = inject(HttpClient);
  private groupTreeCache$: Observable<IGroupTree> | null = null;

  getClientsOverviewData(): Observable<IGroupTree> {
    if (!this.groupTreeCache$) {
      this.groupTreeCache$ = this.httpClient
        .get<IGroupTree>(`${environment.baseUrl}Dashboard/GroupTree`, {
          context: new HttpContext().set(SKIP_LOADING, true),
        })
        .pipe(retry(3), shareReplay(1));
    }
    return this.groupTreeCache$;
  }

  invalidateGroupTreeCache(): void {
    this.groupTreeCache$ = null;
  }

  getClientsLocationsData(): Observable<IClientLocationResource[]> {
    return this.httpClient
      .get<IClientLocationResource[]>(`${environment.baseUrl}Dashboard/ClientLocations`, {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(retry(3));
  }

  getShiftCoverageStatistics(): Observable<IShiftCoverageStatistics[]> {
    return this.httpClient
      .get<IShiftCoverageStatistics[]>(`${environment.baseUrl}Dashboard/ShiftCoverageStatistics`, {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(retry(3));
  }

  getVisibilityStatus(): Observable<IDashboardVisibilityStatus> {
    return this.httpClient
      .get<IDashboardVisibilityStatus>(`${environment.baseUrl}Dashboard/VisibilityStatus`, {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(retry(3));
  }

  getResourceMonitor(year: number, groupId?: string): Observable<IResourceMonitorData> {
    const params: Record<string, string> = { year: year.toString() };
    if (groupId) params['groupId'] = groupId;
    return this.httpClient
      .get<IResourceMonitorData>(`${environment.baseUrl}Dashboard/ResourceMonitor`, {
        params,
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(retry(3));
  }
}
