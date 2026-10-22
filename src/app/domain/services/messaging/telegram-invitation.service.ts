// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Sends the Telegram onboarding invitation of an employee or of an application user through the messaging plugin and
 * interprets the answer as an outcome with the message key to show.
 * @param clientId - Id of the stored employee the invitation is sent to
 * @param userId - Id of the application user the admin invitation is sent to
 * @param result - Result code the messaging plugin answered with
 * @param error - Failed request whose body may carry a result code
 */

import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  DataMessagingInvitationService,
  TelegramInvitationResult,
} from 'src/app/infrastructure/api/messaging/data-messaging-invitation.service';
import {
  AdminInviteResult,
  DataUserMessengerContactService,
} from 'src/app/infrastructure/api/messaging/data-user-messenger-contact.service';
import { SendAdminInviteResponse } from 'src/app/infrastructure/api/messaging/send-admin-invite-response.interface';
import { SendInvitationResponse } from 'src/app/infrastructure/api/messaging/send-invitation-response.interface';
import { TelegramInvitationOutcome } from './telegram-invitation-outcome.interface';
import {
  TELEGRAM_ADMIN_INVITE_ERROR_KEY,
  TELEGRAM_ADMIN_INVITE_MESSAGE_KEYS,
  TELEGRAM_INVITATION_ERROR_KEY,
  TELEGRAM_INVITATION_MESSAGE_KEYS,
} from './telegram-invitation.constants';

@Injectable({ providedIn: 'root' })
export class TelegramInvitationService {
  private dataMessagingInvitationService = inject(DataMessagingInvitationService);
  private dataUserMessengerContactService = inject(DataUserMessengerContactService);

  isTelegramProviderActive(): Observable<boolean> {
    return this.dataMessagingInvitationService.isTelegramProviderActive();
  }

  sendTelegramInvitation(clientId: string): Observable<SendInvitationResponse> {
    return this.dataMessagingInvitationService.sendTelegramInvitation(clientId);
  }

  sendAdminInvite(userId: string): Observable<SendAdminInviteResponse> {
    return this.dataUserMessengerContactService.sendAdminInvite(userId);
  }

  adminInviteOutcomeOf(result: string | undefined): TelegramInvitationOutcome {
    return { isSent: result === AdminInviteResult.Success, messageKey: this.adminInviteMessageKeyOf(result) };
  }

  adminInviteFailureOf(error: HttpErrorResponse): TelegramInvitationOutcome {
    return { isSent: false, messageKey: this.adminInviteMessageKeyOf(error.error?.result) };
  }

  outcomeOf(result: string | undefined): TelegramInvitationOutcome {
    return { isSent: result === TelegramInvitationResult.Success, messageKey: this.messageKeyOf(result) };
  }

  failureOf(error: HttpErrorResponse): TelegramInvitationOutcome {
    return { isSent: false, messageKey: this.messageKeyOf(error.error?.result) };
  }

  private adminInviteMessageKeyOf(result: string | undefined): string {
    return TELEGRAM_ADMIN_INVITE_MESSAGE_KEYS.get(result ?? '') ?? TELEGRAM_ADMIN_INVITE_ERROR_KEY;
  }

  private messageKeyOf(result: string | undefined): string {
    return TELEGRAM_INVITATION_MESSAGE_KEYS.get(result ?? '') ?? TELEGRAM_INVITATION_ERROR_KEY;
  }
}
