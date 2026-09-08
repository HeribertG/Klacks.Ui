// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the installation-wide setup snapshot along the order -> shift -> assignment
 * chain, used to tell an empty installation apart from a filtered-to-nothing list view.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { IScheduleSetupState } from 'src/app/domain/interfaces/schedule-setup-state.interface';

const SETUP_STATE_ENDPOINT = 'setup-state';

@Injectable({
  providedIn: 'root',
})
export class DataScheduleSetupStateService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  getState(): Observable<IScheduleSetupState> {
    return this.httpClient.get<IScheduleSetupState>(
      `${this.baseUrl}${SETUP_STATE_ENDPOINT}`,
      { context: new HttpContext().set(SKIP_LOADING, true) },
    );
  }
}
