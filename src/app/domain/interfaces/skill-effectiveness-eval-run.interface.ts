// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISkillEffectivenessEvalRun {
  goldset: string;
  model: string | null;
  compositeScore: number;
  itemsTotal: number;
  itemsPassed: number;
  createTime: string | null;
}
