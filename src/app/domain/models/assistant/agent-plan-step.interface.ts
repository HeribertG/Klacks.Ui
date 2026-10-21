// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAgentPlanStep {
  order: number;
  skill: string;
  params: Record<string, unknown>;
  verifySkill?: string | null;
  reversible: boolean;
}
