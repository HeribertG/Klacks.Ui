// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for container shift override CRUD operations.
 * @param containerId - The container shift ID
 * @param date - ISO date string for date-specific queries
 */
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IContainerShiftOverride } from 'src/app/domain/models/container/container-shift-override';

@Injectable({
  providedIn: 'root',
})
export class DataContainerShiftOverrideService {
  private httpClient = inject(HttpClient);

  getOverride(containerId: string, date: string): Observable<IContainerShiftOverride> {
    return this.httpClient
      .get<IContainerShiftOverride>(
        `${environment.baseUrl}Containers/${containerId}/overrides/${date}`
      );
  }

  getOverridesForRange(containerId: string, fromDate: string, toDate: string): Observable<IContainerShiftOverride[]> {
    let params = new HttpParams();
    params = params.append('from', fromDate);
    params = params.append('to', toDate);

    return this.httpClient
      .get<IContainerShiftOverride[]>(
        `${environment.baseUrl}Containers/${containerId}/overrides`,
        { params }
      )
      .pipe(retry(3));
  }

  postOverride(containerId: string, data: IContainerShiftOverride): Observable<IContainerShiftOverride> {
    const cleanedData = JSON.parse(JSON.stringify(data));
    this.cleanItems(cleanedData);
    delete cleanedData.id;
    return this.httpClient
      .post<IContainerShiftOverride>(
        `${environment.baseUrl}Containers/${containerId}/overrides`,
        cleanedData
      )
      .pipe(retry(3));
  }

  putOverride(containerId: string, overrideId: string, data: IContainerShiftOverride): Observable<IContainerShiftOverride> {
    const cleanedData = JSON.parse(JSON.stringify(data));
    this.cleanItemsForPut(cleanedData);
    return this.httpClient
      .put<IContainerShiftOverride>(
        `${environment.baseUrl}Containers/${containerId}/overrides/${overrideId}`,
        cleanedData
      )
      .pipe(retry(3));
  }

  deleteOverride(containerId: string, overrideId: string): Observable<void> {
    return this.httpClient
      .delete<void>(
        `${environment.baseUrl}Containers/${containerId}/overrides/${overrideId}`
      )
      .pipe(retry(3));
  }

  private cleanItems(data: IContainerShiftOverride): void {
    delete data.shift;
    data.containerShiftOverrideItems?.forEach(item => {
      delete item.shift;
      delete item.absence;
      delete item.id;
      delete item.containerShiftOverrideId;
    });
  }

  private cleanItemsForPut(data: IContainerShiftOverride): void {
    delete data.shift;
    data.containerShiftOverrideItems?.forEach(item => {
      delete item.shift;
      delete item.absence;
    });
  }
}
