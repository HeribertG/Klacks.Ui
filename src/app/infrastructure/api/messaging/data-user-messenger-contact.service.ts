// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * HTTP client for the admin-initiated user messenger pairing invite.
 * Plugin controllers are mounted under /api (not /api/backend), so the base URL
 * drops the backend segment, matching DataMessagingInvitationService.
 * @param userId - Target AppUser id.
 */

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SendAdminInviteResponse } from './send-admin-invite-response.interface';
import { getApiRootUrl } from 'src/app/infrastructure/helpers/api-root-url.helper';

export const AdminInviteResult = {
  Success: 'Success',
  UserNotFound: 'UserNotFound',
  AlreadyLinked: 'AlreadyLinked',
  NoEmail: 'NoEmail',
  SendFailed: 'SendFailed',
  NoTelegramProvider: 'NoTelegramProvider',
} as const;

@Injectable({ providedIn: 'root' })
export class DataUserMessengerContactService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = getApiRootUrl() + 'user-messenger-contacts/';

  public sendAdminInvite(userId: string): Observable<SendAdminInviteResponse> {
    return this.httpClient.post<SendAdminInviteResponse>(`${this.baseUrl}admin-invite/${userId}`, {});
  }
}
