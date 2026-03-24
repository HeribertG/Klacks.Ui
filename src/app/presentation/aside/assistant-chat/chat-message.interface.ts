// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  suggestedReplies?: ISuggestedRepliesConfig;
  navigateTo?: string;
  actionPerformed?: boolean;
  isStreaming?: boolean;
}
