// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IConversationMessage } from 'src/app/domain/models/assistant/conversation-message.interface';

export interface IConversation {
  id: string;
  messages: IConversationMessage[];
  startTime: Date;
  lastActivity: Date;
  totalCost?: number;
}
