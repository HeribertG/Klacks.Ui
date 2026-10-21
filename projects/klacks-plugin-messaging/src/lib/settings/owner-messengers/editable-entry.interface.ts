// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MessengerType } from '../../enums/messenger-type.enum';

export interface EditableEntry {
  type: MessengerType;
  value: string;
  description: string;
}
