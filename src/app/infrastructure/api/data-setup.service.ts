// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the forced own-admin setup flow.
 * @param getStatus - Checks whether the own-admin setup gate is still active
 * @param completeOwnAdmin - Registers the caller's own admin account and deactivates the seeded admin in one transaction
 */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { SetupOwnAdminRequest } from 'src/app/domain/models/setup/setup-own-admin-request.interface';
import { SetupStatus } from 'src/app/domain/models/setup/setup-status.interface';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataSetupService {
  private httpClient = inject(HttpClient);

  getStatus(): Observable<SetupStatus> {
    return this.httpClient
      .get<SetupStatus>(`${environment.baseUrl}Setup/Status`)
      .pipe(retry(3));
  }

  completeOwnAdmin(value: SetupOwnAdminRequest): Observable<void> {
    return this.httpClient.post<void>(
      `${environment.baseUrl}Setup/CompleteOwnAdmin`,
      value
    );
  }
}
