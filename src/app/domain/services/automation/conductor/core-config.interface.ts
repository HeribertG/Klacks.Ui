// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface CoreConfig {
  populationSize: number;
  maxGenerations: number;
  eliteCount: number;
  mutationRate: number;
  crossoverRate: number;
  convergenceThreshold: number;
  stagnationLimit: number;
  targetFitness: number;
  timeLimitMs: number;
  warmStartRatio: number;
  randomSeed?: number;
}
