// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the messaging plugin onboarding endpoint.
 * Plugin controllers are mounted under /api/messaging (not /api/backend),
 * so the base URL drops the backend segment.
 * @param clientId - Target employee client id.
 */

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { getApiRootUrl } from 'src/app/infrastructure/helpers/api-root-url.helper';

export interface SendInvitationResponse {
  result: string;
}

@Injectable({ providedIn: 'root' })
export class DataMessagingInvitationService {
  private httpClient = inject(HttpClient);
  private readonly pluginBaseUrl = getApiRootUrl() + 'messaging/onboarding/';

  public sendTelegramInvitation(clientId: string): Observable<SendInvitationResponse> {
    return this.httpClient.post<SendInvitationResponse>(
      `${this.pluginBaseUrl}telegram/send/${clientId}`,
      {}
    );
  }
}
