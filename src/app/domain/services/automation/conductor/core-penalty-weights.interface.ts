// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface CorePenaltyWeights {
  hardViolation: number;
  softViolation: number;
  coverageBonus: number;
  motivationBonus: number;
  fairnessBonus: number;
  uncoveredPenalty: number;
}
