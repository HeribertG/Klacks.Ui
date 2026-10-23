// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One agent a critic finding refers to.
 * @param name - Display name, or the row label (r00, ...) when the name is unknown
 * @param dates - Dates of the cited cells in ascending order; empty when the period start is unknown
 */
export interface PlanCriticAffectedAgent {
  name: string;
  dates: Date[];
}
