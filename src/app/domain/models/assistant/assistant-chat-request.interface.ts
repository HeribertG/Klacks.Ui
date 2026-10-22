// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAssistantChatContext } from 'src/app/domain/models/assistant/assistant-chat-context.interface';

export interface IAssistantChatRequest {
  message: string;
  conversationId?: string;
  modelId?: string;
  language?: string;
  context?: IAssistantChatContext;
  agentId?: string;
  pageContext?: import('src/app/domain/models/assistant/assistant-page-context.interface').IAssistantPageContext;
  isVoiceMode?: boolean;
}
