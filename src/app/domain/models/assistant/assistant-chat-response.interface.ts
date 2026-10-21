// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-replies-config.interface';

export interface IAssistantChatResponse {
  message: string;
  conversationId: string;
  suggestions?: string[];
  suggestedReplies?: ISuggestedRepliesConfig;
  navigateTo?: string;
  actionPerformed?: boolean;
  functionCalls?: any[];
  functionResults?: any[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}
