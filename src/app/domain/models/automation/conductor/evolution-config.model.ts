// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IEvolutionConfig {
  populationSize: number;
  maxGenerations: number;
  eliteCount: number;
  mutationRate: number;
  crossoverRate: number;
  convergenceThreshold: number;
  randomSeed?: number;
  stagnationLimit: number;
  targetFitness: number;
  timeLimitMs: number;
  warmStartRatio: number;
}

export const DEFAULT_EVOLUTION_CONFIG: IEvolutionConfig = {
  populationSize: 50,
  maxGenerations: 200,
  eliteCount: 5,
  mutationRate: 0.15,
  crossoverRate: 0.8,
  convergenceThreshold: 0.001,
  stagnationLimit: 40,
  targetFitness: 0.95,
  timeLimitMs: 15000,
  warmStartRatio: 0.7
};
