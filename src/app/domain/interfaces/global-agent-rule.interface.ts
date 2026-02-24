// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
