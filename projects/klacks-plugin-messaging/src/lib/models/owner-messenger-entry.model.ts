// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Single entry in the APP_OWNER_MESSENGERS jsonb setting.
 * @param type - Which messenger this entry is for
 * @param value - Provider-specific identifier (chat_id, phone, ...)
 * @param description - Optional human-readable note
 */

import { MessengerType } from '../enums/messenger-type.enum';

export interface OwnerMessengerEntry {
  type: MessengerType;
  value: string;
  description?: string | null;
}
