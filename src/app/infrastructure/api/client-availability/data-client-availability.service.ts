// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import { IClientAvailability } from 'src/app/domain/models/client-availability/client-availability.interface';
import { IClientAvailabilityBulkRequest } from 'src/app/domain/models/client-availability/client-availability-bulk-request.interface';
import { IClientAvailabilityClientFilter } from 'src/app/domain/models/client-availability/client-availability-client-filter.interface';
import { IClientAvailabilityClientResponse } from 'src/app/domain/models/client-availability/client-availability-client-response.interface';
import { IClientAvailabilityRange } from 'src/app/domain/models/client-availability/client-availability-range.interface';
import { IClientAvailabilityTotal } from 'src/app/domain/models/client-availability/client-availability-total.interface';

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

  getAvailabilityRanges(startDate: string, endDate: string, clientIds: string[]) {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    for (const clientId of clientIds) {
      params = params.append('clientIds', clientId);
    }

    return this.httpClient
      .get<IClientAvailabilityRange[]>(
        `${environment.baseUrl}ClientAvailabilities/Ranges`,
        { params }
      )
      .pipe(retry(3));
  }

  getAvailabilityTotals(startDate: string, endDate: string, clientIds: string[]) {
    return this.httpClient
      .post<IClientAvailabilityTotal[]>(
        `${environment.baseUrl}ClientAvailabilities/Totals`,
        { startDate, endDate, clientIds }
      )
      .pipe(retry(3));
  }
}
