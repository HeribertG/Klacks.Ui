// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * API service for the read-only GeoServicesConfig endpoint (which geo services the installation may use).
 * @param httpClient - Angular HTTP client used to call the backend
 */

import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { GEO_SERVICES_CONFIG_PATH } from 'src/app/domain/constants/geo-services-api.constants';
import { IGeoServicesConfig } from 'src/app/domain/models/settings/geo-services-config.model';

const GEO_SERVICES_CONFIG_RETRY_COUNT = 2;

@Injectable({
  providedIn: 'root',
})
export class DataGeoServicesConfigService {
  private httpClient = inject(HttpClient);

  readGeoServicesConfig(): Observable<IGeoServicesConfig> {
    return this.httpClient
      .get<IGeoServicesConfig>(`${environment.baseUrl}${GEO_SERVICES_CONFIG_PATH}`, {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(retry(GEO_SERVICES_CONFIG_RETRY_COUNT));
  }
}
