// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-replies-config.interface';

export interface IAssistantChatResponse {
  message: string;
  conversationId: string;
  suggestions?: string[];
  suggestedReplies?: ISuggestedRepliesConfig;
  navigateTo?: string;
  actionPerformed?: boolean;
  functionCalls?: Record<string, unknown>[];
  functionResults?: Record<string, unknown>[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}
