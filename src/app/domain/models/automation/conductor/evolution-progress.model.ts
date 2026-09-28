// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IEvolutionProgress {
  currentGeneration: number;
  maxGenerations: number;
  bestFitness: number;
  avgFitness: number;
  coverage: number;
  isConverged: boolean;
  improvement: number;
  timeElapsedMs: number;
  stagnationCount: number;
  stopReason?: 'converged' | 'stagnation' | 'target' | 'timeout' | 'maxgen' | 'cancelled';
}
