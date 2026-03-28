// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for client shift preference CRUD operations.
 * @param clientId - The client whose preferences to fetch or save
 */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import {
  IAvailableShift,
  IClientShiftPreference,
} from 'src/app/domain/models/shift/shift-preference';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataShiftPreferenceService {
  private httpClient = inject(HttpClient);

  getByClient(clientId: string) {
    return this.httpClient
      .get<IClientShiftPreference[]>(
        `${environment.baseUrl}ClientShiftPreferences?clientId=${clientId}`,
      )
      .pipe(retry(3));
  }

  getAvailableShifts(clientId: string) {
    return this.httpClient
      .get<IAvailableShift[]>(
        `${environment.baseUrl}ClientShiftPreferences/available-shifts?clientId=${clientId}`,
      )
      .pipe(retry(3));
  }

  saveAll(clientId: string, preferences: IClientShiftPreference[]) {
    return this.httpClient
      .post<IClientShiftPreference[]>(
        `${environment.baseUrl}ClientShiftPreferences/bulk`,
        { clientId, preferences },
      )
      .pipe(retry(3));
  }
}
