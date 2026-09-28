// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * MessengerContact attached to a Klacks client (employee or customer).
 * @param id - Primary key
 * @param clientId - FK to the Klacks client
 * @param type - MessengerType enum value
 * @param value - Provider-specific identifier
 * @param description - Optional human-readable note
 */

import { MessengerType } from '../enums/messenger-type.enum';

export interface MessengerContact {
  id: string;
  clientId: string;
  type: MessengerType;
  value: string;
  description?: string | null;
}

export interface CreateMessengerContact {
  clientId: string;
  type: MessengerType;
  value: string;
  description?: string | null;
}
