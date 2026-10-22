// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAssistantUserContext } from 'src/app/domain/models/assistant/assistant-user-context.interface';
import { IConversationMessage } from 'src/app/domain/models/assistant/conversation-message.interface';

export interface IAssistantChatContext {
  conversationHistory: IConversationMessage[];
  language: string;
  userContext: IAssistantUserContext | null;
}
