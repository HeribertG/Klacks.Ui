// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISkillEffectivenessSkillStat {
  skillName: string;
  calls: number;
  successes: number;
  failures: number;
  successRate: number;
}
