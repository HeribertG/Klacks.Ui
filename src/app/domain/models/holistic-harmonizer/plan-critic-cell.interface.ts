// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One plan cell a vision-critic finding refers to (mirror of PlanCriticCellDto in Klacks.Api).
 * @param row - Zero-based row index; maps to the agent through agentDisplayNames of the same run response
 * @param day - Zero-based day index of the run period
 * @param symbol - Cell symbol: E, L, N, O, B, or _ for a free cell
 */
export interface PlanCriticCell {
  row: number;
  day: number;
  symbol: string;
}
