// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IGlobalAgentRule {
  id: string;
  name: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
  version: number;
  source?: string;
  createTime: string;
}
