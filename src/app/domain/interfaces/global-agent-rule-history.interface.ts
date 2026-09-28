// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IGlobalAgentRuleHistory {
  id: string;
  name: string;
  contentBefore?: string;
  contentAfter: string;
  version: number;
  changeType: string;
  changedBy?: string;
  createTime: string;
}
