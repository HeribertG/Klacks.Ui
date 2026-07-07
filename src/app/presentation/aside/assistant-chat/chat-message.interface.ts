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
  /** Pre-formatted HTML content, kept in sync with content on every update including streaming flushes. */
  formattedContent?: string;
  /** User message that this assistant response answered. Set on assistant messages only. */
  respondedToUserMessage?: string;
  /** Set after the user submitted a correction for this assistant message. */
  correctionSubmitted?: boolean;
}
