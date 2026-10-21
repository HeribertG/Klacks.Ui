// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
