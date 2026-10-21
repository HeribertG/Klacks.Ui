// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAgentSoulSectionSummary } from './agent-soul-section-summary.interface';

export interface IAgent {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createTime: string;
  soulSections?: IAgentSoulSectionSummary[];
  skillCount?: number;
}
