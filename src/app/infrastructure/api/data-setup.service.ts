// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * API service for the forced own-admin setup flow.
 * @param getStatus - Checks whether the own-admin setup gate is still active
 * @param completeOwnAdmin - Registers the caller's own admin account and deactivates the seeded admin in one transaction
 * @param getFirstStartStatus - Anonymous probe: can the installation still be claimed without signing in (no retry,
 * the caller treats a failure as "no")
 * @param completeFirstStart - Anonymous variant of completeOwnAdmin, only accepted while the first-start probe says yes
 */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { FirstStartSetupRequest } from 'src/app/domain/models/setup/first-start-setup-request.interface';
import { SetupOwnAdminRequest } from 'src/app/domain/models/setup/setup-own-admin-request.interface';
import { SetupStatus } from 'src/app/domain/models/setup/setup-status.interface';
import {
  SETUP_COMPLETE_FIRST_START_API_SEGMENT,
  SETUP_COMPLETE_OWN_ADMIN_API_SEGMENT,
  SETUP_FIRST_START_STATUS_API_SEGMENT,
  SETUP_STATUS_API_SEGMENT,
} from 'src/app/domain/constants/setup.constants';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataSetupService {
  private httpClient = inject(HttpClient);

  getStatus(): Observable<SetupStatus> {
    return this.httpClient
      .get<SetupStatus>(`${environment.baseUrl}${SETUP_STATUS_API_SEGMENT}`)
      .pipe(retry(3));
  }

  completeOwnAdmin(value: SetupOwnAdminRequest): Observable<void> {
    return this.httpClient.post<void>(
      `${environment.baseUrl}${SETUP_COMPLETE_OWN_ADMIN_API_SEGMENT}`,
      value
    );
  }

  getFirstStartStatus(): Observable<SetupStatus> {
    return this.httpClient.get<SetupStatus>(`${environment.baseUrl}${SETUP_FIRST_START_STATUS_API_SEGMENT}`);
  }

  completeFirstStart(value: FirstStartSetupRequest): Observable<void> {
    return this.httpClient.post<void>(`${environment.baseUrl}${SETUP_COMPLETE_FIRST_START_API_SEGMENT}`, value);
  }
}
