// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the messaging plugin onboarding endpoint.
 * Plugin controllers are mounted under /api/messaging (not /api/backend),
 * so the base URL drops the backend segment.
 * @param clientId - Target employee client id.
 */

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { getApiRootUrl } from 'src/app/infrastructure/helpers/api-root-url.helper';

export interface SendInvitationResponse {
  result: string;
}

interface MessagingProviderSummary {
  providerType: string;
  isEnabled: boolean;
}

const TELEGRAM_PROVIDER_TYPE = 'Telegram';

export const TelegramInvitationResult = {
  Success: 'Success',
  NotEmployee: 'NotEmployee',
  NoContactChannel: 'NoContactChannel',
  AlreadyLinked: 'AlreadyLinked',
  SendFailed: 'SendFailed',
  NoTelegramProvider: 'NoTelegramProvider',
} as const;

@Injectable({ providedIn: 'root' })
export class DataMessagingInvitationService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = getApiRootUrl() + 'messaging/';

  public sendTelegramInvitation(clientId: string): Observable<SendInvitationResponse> {
    return this.httpClient.post<SendInvitationResponse>(
      `${this.baseUrl}onboarding/telegram/send/${clientId}`,
      {}
    );
  }

  public isTelegramProviderActive(): Observable<boolean> {
    return this.httpClient
      .get<MessagingProviderSummary[]>(`${this.baseUrl}providers`)
      .pipe(map((providers) => providers.some((p) => p.isEnabled && p.providerType === TELEGRAM_PROVIDER_TYPE)));
  }
}
