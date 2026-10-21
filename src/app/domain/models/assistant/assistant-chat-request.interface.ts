// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface IAssistantChatRequest {
  message: string;
  conversationId?: string;
  modelId?: string;
  language?: string;
  context?: any;
  agentId?: string;
  pageContext?: import('src/app/domain/models/assistant/assistant-page-context.interface').IAssistantPageContext;
  isVoiceMode?: boolean;
}
