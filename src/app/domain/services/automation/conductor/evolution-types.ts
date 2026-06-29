// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Core data structures for the evolutionary scheduling engine (shifts, agents,
 * scenarios, config, penalty weights, progress/result payloads and callbacks).
 */

export interface CoreShift {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  requiredAssignments: number;
  priority: number;
}

export interface CoreAgent {
  id: string;
  currentHours: number;
  guaranteedHours: number;
  maxConsecutiveDays: number;
  minRestHours: number;
  motivation: number;
  maxDailyHours: number;
  maxWeeklyHours: number;
  maxOptimalGap: number;
}

export interface CoreAssignment {
  shiftId: string;
  agentId: string;
  motivationScore: number;
}

export interface CoreScenario {
  id: string;
  assignments: CoreAssignment[];
  fitness: number;
  coverage: number;
  penaltyScore: number;
  hardViolations: number;
}

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

export interface CorePenaltyWeights {
  hardViolation: number;
  softViolation: number;
  coverageBonus: number;
  motivationBonus: number;
  fairnessBonus: number;
  uncoveredPenalty: number;
}

export interface CoreProgressData {
  currentGeneration: number;
  maxGenerations: number;
  bestFitness: number;
  avgFitness: number;
  coverage: number;
  timeElapsedMs: number;
  stagnationCount: number;
}

export interface CoreResultData {
  assignments: CoreAssignment[];
  fitness: number;
  coverage: number;
  penaltyScore: number;
  hardViolations: number;
  finalGeneration: number;
  stopReason: string;
  message: string;
  timeElapsedMs: number;
}

export type RngFn = () => number;

export interface EvolutionCallbacks {
  onProgress: (data: CoreProgressData) => void;
  onResult: (data: CoreResultData) => void;
}
