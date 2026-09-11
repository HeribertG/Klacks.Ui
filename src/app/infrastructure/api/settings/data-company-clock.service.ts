// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the read-only CompanyClock endpoint (company time zone, today, resolution source).
 * @param httpClient - Angular HTTP client used to call the backend
 */

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ICompanyClockResource } from 'src/app/domain/models/settings/company-clock.model';

@Injectable({
  providedIn: 'root',
})
export class DataCompanyClockService {
  private httpClient = inject(HttpClient);

  readCompanyClock(): Observable<ICompanyClockResource> {
    return this.httpClient.get<ICompanyClockResource>(`${environment.baseUrl}CompanyClock`).pipe(retry(3));
  }
}
