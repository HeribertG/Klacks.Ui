// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IGenerationStats {
  generation: number;
  bestFitness: number;
  worstFitness: number;
  avgFitness: number;
  diversity: number;
}
