// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export type SkillRelationType = 'CoRequired' | 'Sequential';
export type SkillRelationSource = 'Derived' | 'Learned';
export type SkillRelationStatus = 'Candidate' | 'Active' | 'Retired';

export interface ISkillRelation {
  id: string;
  skillAName: string;
  skillBName: string;
  type: SkillRelationType;
  confidence: number;
  supportCount: number;
  contradictionCount: number;
  source: SkillRelationSource;
  status: SkillRelationStatus;
  provenance: string;
  lastReinforcedAt: string | null;
}
