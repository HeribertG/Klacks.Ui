// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IGenerationStats {
  generation: number;
  bestFitness: number;
  worstFitness: number;
  avgFitness: number;
  diversity: number;
}
