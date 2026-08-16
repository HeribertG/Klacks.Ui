// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * A messenger channel that belongs to the signed-in application user rather than to a client.
 * @param id - Identifier of the stored channel
 * @param userId - Owning application user; the API only ever returns the caller's own channels here
 * @param type - Which messenger this channel is for
 * @param value - Provider-specific identifier, written by the pairing flow and never typed in by hand
 * @param description - Optional note stored alongside the channel
 * @param isPreferred - The one channel a single-channel notification is sent to
 */

import { MessengerType } from '../enums/messenger-type.enum';

export interface UserMessengerContact {
  id: string;
  userId: string;
  type: MessengerType;
  value: string;
  description: string | null;
  isPreferred: boolean;
}

/**
 * A freshly issued pairing code together with the instant it stops being redeemable.
 * @param code - The code the user sends to the bot
 * @param expiresAt - ISO timestamp after which the code is refused
 */
export interface UserMessengerPairingCode {
  code: string;
  expiresAt: string;
}
