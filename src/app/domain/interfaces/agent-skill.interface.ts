// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAgentSkillSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  isEnabled: boolean;
  sortOrder: number;
  executionType: string;
  version: number;
}
