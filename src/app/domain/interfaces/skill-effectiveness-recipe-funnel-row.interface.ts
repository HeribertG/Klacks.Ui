// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISkillEffectivenessRecipeFunnelRow {
  recipeName: string;
  started: number;
  running: number;
  completed: number;
  aborted: number;
  expired: number;
}
