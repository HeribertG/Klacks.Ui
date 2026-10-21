// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-replies-config.interface';

export interface StreamMetadata {
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number; cost: number };
  suggestions?: string[];
  suggestedReplies?: ISuggestedRepliesConfig;
  navigateTo?: string;
  target?: string;
  /** In-page target the server's matcher expected although the model navigated without one (W0). */
  missedTargetId?: string;
  actionPerformed?: boolean;
  functionCalls?: Record<string, unknown>[];
}
