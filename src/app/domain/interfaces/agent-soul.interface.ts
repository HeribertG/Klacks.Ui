// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IAgentSoulSection {
  id: string;
  sectionType: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
  version: number;
  source?: string;
  createTime: string;
}

export interface IAgentSoulHistory {
  id: string;
  sectionType: string;
  contentBefore?: string;
  contentAfter: string;
  version: number;
  changeType: string;
  changedBy?: string;
  createTime: string;
}

export interface IUpsertSoulRequest {
  content: string;
  sortOrder?: number;
}
