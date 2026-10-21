// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * A freshly issued pairing code together with the instant it stops being redeemable.
 * @param code - The code the user sends to the bot
 * @param expiresAt - ISO timestamp after which the code is refused
 */
export interface UserMessengerPairingCode {
  code: string;
  expiresAt: string;
}
