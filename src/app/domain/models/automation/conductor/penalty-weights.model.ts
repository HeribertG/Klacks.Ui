export interface IPenaltyWeights {
  hardViolation: number;
  softViolation: number;
  coverageBonus: number;
  motivationBonus: number;
  fairnessBonus: number;
}

export const DEFAULT_PENALTY_WEIGHTS: IPenaltyWeights = {
  hardViolation: -1000,
  softViolation: -200,
  coverageBonus: 100,
  motivationBonus: 50,
  fairnessBonus: 30
};
