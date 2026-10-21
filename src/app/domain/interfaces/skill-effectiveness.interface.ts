// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * W6.1: shape of the aggregated "Skill-Wirksamkeit" scorecard from the admin endpoint.
 */

import { ISkillEffectivenessEvalRun } from './skill-effectiveness-eval-run.interface';
import { ISkillEffectivenessRecipeFunnelRow } from './skill-effectiveness-recipe-funnel-row.interface';
import { ISkillEffectivenessFailureSummary } from './skill-effectiveness-failure-summary.interface';
import { ISkillEffectivenessSkillStat } from './skill-effectiveness-skill-stat.interface';
import { ISkillEffectivenessSourceRow } from './skill-effectiveness-source-row.interface';
export interface ISkillEffectivenessResource {
  days: number;
  evalTrend: ISkillEffectivenessEvalRun[];
  recipeFunnel: ISkillEffectivenessRecipeFunnelRow[];
  failureSummary: ISkillEffectivenessFailureSummary;
  topSkills: ISkillEffectivenessSkillStat[];
  flopSkills: ISkillEffectivenessSkillStat[];
  chosenSourceDistribution: ISkillEffectivenessSourceRow[];
}
