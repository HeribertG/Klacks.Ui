// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for per-user proactive trigger preferences (mute a trigger kind).
 * @param triggerKind - Trigger kind whose preference is updated (e.g. unstaffed_shift)
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { ITriggerPreference } from 'src/app/domain/interfaces/trigger-preference.interface';

export interface IUpdateTriggerPreferenceRequest {
  muted?: boolean;
  snoozedUntilUtc?: string | null;
  minimumSeverity?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class DataTriggerPreferenceService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  muteKind(triggerKind: string): Observable<ITriggerPreference> {
    const request: IUpdateTriggerPreferenceRequest = { muted: true };
    return this.httpClient
      .put<ITriggerPreference>(
        `${this.baseUrl}trigger-preferences/${triggerKind}`,
        request,
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(retry(3));
  }
}
