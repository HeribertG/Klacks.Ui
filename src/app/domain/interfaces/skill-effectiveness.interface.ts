// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * W6.1: shape of the aggregated "Skill-Wirksamkeit" scorecard from the admin endpoint.
 */
export interface ISkillEffectivenessResource {
  days: number;
  evalTrend: ISkillEffectivenessEvalRun[];
  recipeFunnel: ISkillEffectivenessRecipeFunnelRow[];
  failureSummary: ISkillEffectivenessFailureSummary;
  topSkills: ISkillEffectivenessSkillStat[];
  flopSkills: ISkillEffectivenessSkillStat[];
  chosenSourceDistribution: ISkillEffectivenessSourceRow[];
}

export interface ISkillEffectivenessEvalRun {
  goldset: string;
  model: string | null;
  compositeScore: number;
  itemsTotal: number;
  itemsPassed: number;
  createTime: string | null;
}

export interface ISkillEffectivenessRecipeFunnelRow {
  recipeName: string;
  started: number;
  running: number;
  completed: number;
  aborted: number;
  expired: number;
}

export interface ISkillEffectivenessFailureSummary {
  totalRows: number;
  notFound: number;
  permissionDenied: number;
  parameterInvalid: number;
  gateHold: number;
  uiActionContext: number;
  exception: number;
  hallucinationRate: number;
}

export interface ISkillEffectivenessSkillStat {
  skillName: string;
  calls: number;
  successes: number;
  failures: number;
  successRate: number;
}

export interface ISkillEffectivenessSourceRow {
  source: string;
  count: number;
}
