// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAgentSession {
  id: string;
  sessionId: string;
  title?: string;
  status: string;
  messageCount: number;
  tokenCountEst: number;
  lastMessageAt?: string;
  isArchived: boolean;
}

export interface IAgentSessionMessage {
  id: string;
  role: string;
  content?: string;
  tokenCount?: number;
  modelId?: string;
  functionCalls?: string;
  createTime: string;
}
