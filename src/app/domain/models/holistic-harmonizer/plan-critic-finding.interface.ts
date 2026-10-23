// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PlanCriticCell } from './plan-critic-cell.interface';

/**
 * One pattern the vision critic sees in a finished stage-3 plan (mirror of PlanCriticFindingDto in Klacks.Api).
 * Every cell has been checked against the real plan by the backend.
 * @param pattern - Short snake_case label chosen by the critic, e.g. "night_then_early"
 * @param description - Explanation in the run language; refers to rows as r00, r01, ...
 * @param severity - Low, Medium or High
 * @param cells - Cells that show the pattern
 */
export interface PlanCriticFinding {
  pattern: string;
  description: string;
  severity: string;
  cells: PlanCriticCell[];
}
