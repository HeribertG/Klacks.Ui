// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
