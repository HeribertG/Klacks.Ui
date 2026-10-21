// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Translation keys of the Telegram invitation results answered by the messaging plugin.
 */

import { TelegramInvitationResult } from 'src/app/infrastructure/api/messaging/data-messaging-invitation.service';

export const TELEGRAM_INVITATION_ERROR_KEY = 'messaging.sendTelegramInvitation.error';

export const TELEGRAM_INVITATION_MESSAGE_KEYS: ReadonlyMap<string, string> = new Map([
  [TelegramInvitationResult.Success, 'messaging.sendTelegramInvitation.success'],
  [TelegramInvitationResult.AlreadyLinked, 'messaging.sendTelegramInvitation.alreadyLinked'],
  [TelegramInvitationResult.NoContactChannel, 'messaging.sendTelegramInvitation.noContactChannel'],
  [TelegramInvitationResult.SendFailed, 'messaging.sendTelegramInvitation.sendFailed'],
  [TelegramInvitationResult.NotEmployee, 'messaging.sendTelegramInvitation.notEmployee'],
  [TelegramInvitationResult.NoTelegramProvider, 'messaging.sendTelegramInvitation.noProvider'],
]);
