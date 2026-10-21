// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAssistantUsage {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  conversationCount: number;
  modelBreakdown: {
    modelId: string;
    displayName: string;
    totalCost: number;
    usageCount: number;
  }[];
}
