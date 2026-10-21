// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Translation keys of the Telegram invitation results answered by the messaging plugin, for employees and for application users.
 */

import { TelegramInvitationResult } from 'src/app/infrastructure/api/messaging/data-messaging-invitation.service';
import { AdminInviteResult } from 'src/app/infrastructure/api/messaging/data-user-messenger-contact.service';

export const TELEGRAM_INVITATION_ERROR_KEY = 'messaging.sendTelegramInvitation.error';

export const TELEGRAM_INVITATION_MESSAGE_KEYS: ReadonlyMap<string, string> = new Map([
  [TelegramInvitationResult.Success, 'messaging.sendTelegramInvitation.success'],
  [TelegramInvitationResult.AlreadyLinked, 'messaging.sendTelegramInvitation.alreadyLinked'],
  [TelegramInvitationResult.NoContactChannel, 'messaging.sendTelegramInvitation.noContactChannel'],
  [TelegramInvitationResult.SendFailed, 'messaging.sendTelegramInvitation.sendFailed'],
  [TelegramInvitationResult.NotEmployee, 'messaging.sendTelegramInvitation.notEmployee'],
  [TelegramInvitationResult.NoTelegramProvider, 'messaging.sendTelegramInvitation.noProvider'],
]);

export const TELEGRAM_ADMIN_INVITE_ERROR_KEY = 'messaging.sendUserTelegramInvite.error';

export const TELEGRAM_ADMIN_INVITE_MESSAGE_KEYS: ReadonlyMap<string, string> = new Map([
  [AdminInviteResult.Success, 'messaging.sendUserTelegramInvite.success'],
  [AdminInviteResult.AlreadyLinked, 'messaging.sendUserTelegramInvite.alreadyLinked'],
  [AdminInviteResult.UserNotFound, 'messaging.sendUserTelegramInvite.userNotFound'],
  [AdminInviteResult.NoEmail, 'messaging.sendUserTelegramInvite.noEmail'],
  [AdminInviteResult.SendFailed, 'messaging.sendUserTelegramInvite.sendFailed'],
  [AdminInviteResult.NoTelegramProvider, 'messaging.sendUserTelegramInvite.noProvider'],
]);
