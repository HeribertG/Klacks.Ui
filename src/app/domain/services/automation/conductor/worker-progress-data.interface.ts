// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IWorkerProgressData {
  currentGeneration: number;
  maxGenerations: number;
  bestFitness: number;
  avgFitness: number;
  coverage: number;
  timeElapsedMs: number;
  stagnationCount: number;
}
