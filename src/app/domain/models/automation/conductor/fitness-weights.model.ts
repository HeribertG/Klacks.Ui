export interface IFitnessWeights {
  coverage: number;
  motivation: number;
  fairness: number;
  violations: number;
}

export const DEFAULT_FITNESS_WEIGHTS: IFitnessWeights = {
  coverage: 0.5,
  motivation: 0.3,
  fairness: 0.1,
  violations: -0.1
};
