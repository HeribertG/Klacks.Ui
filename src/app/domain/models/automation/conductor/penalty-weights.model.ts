// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IPenaltyWeights {
  hardViolation: number;
  softViolation: number;
  coverageBonus: number;
  motivationBonus: number;
  fairnessBonus: number;
  uncoveredPenalty: number;
}

export const DEFAULT_PENALTY_WEIGHTS: IPenaltyWeights = {
  hardViolation: -1000,
  softViolation: -100,
  coverageBonus: 100,
  motivationBonus: 50,
  fairnessBonus: 30,
  uncoveredPenalty: -600
};
