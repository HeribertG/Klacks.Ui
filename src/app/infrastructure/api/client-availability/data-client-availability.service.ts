// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import {
  IClientAvailability,
  IClientAvailabilityBulkRequest,
} from 'src/app/domain/models/client-availability/client-availability-class';
import { IClientAvailabilityClientFilter } from 'src/app/domain/models/client-availability/client-availability-client-filter.interface';
import { IClientAvailabilityClientResponse } from 'src/app/domain/models/client-availability/client-availability-client-response.interface';

@Injectable({
  providedIn: 'root',
})
export class DataClientAvailabilityService {
  private httpClient = inject(HttpClient);

  getAvailabilities(startDate: string, endDate: string) {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.httpClient
      .get<IClientAvailability[]>(
        `${environment.baseUrl}ClientAvailabilities`,
        { params }
      )
      .pipe(retry(3));
  }

  bulkUpdate(request: IClientAvailabilityBulkRequest) {
    return this.httpClient
      .post<number>(
        `${environment.baseUrl}ClientAvailabilities/Bulk`,
        request
      )
      .pipe(retry(3));
  }

  getClients(filter: IClientAvailabilityClientFilter) {
    return this.httpClient
      .post<IClientAvailabilityClientResponse>(
        `${environment.baseUrl}ClientAvailabilities/Clients`,
        filter
      )
      .pipe(retry(3));
  }
}
