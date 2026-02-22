// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
