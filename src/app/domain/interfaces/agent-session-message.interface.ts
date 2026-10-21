// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAgentSessionMessage {
  id: string;
  role: string;
  content?: string;
  tokenCount?: number;
  modelId?: string;
  functionCalls?: string;
  createTime: string;
}
