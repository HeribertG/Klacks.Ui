import { IScheduleAgent } from '../agent/schedule-agent.model';

export interface IShift {
  id: string;
  name: string;
  date: Date;
  startTime: string;
  endTime: string;
  hours: number;
  requiredAssignments: number;
  priority: number;
}

export interface IAssignment {
  shiftId: string;
  agentId: string;
  motivationScore: number;
  timestamp: Date;
}

export interface ISchedulingScenario {
  id: string;
  generation: number;
  assignments: IAssignment[];
  fitness: number;
  coverage: number;
  avgMotivation: number;
  violationCount: number;
  unassignedShifts: string[];
  chromosome: Map<string, string | null>;
  penaltyScore: number;
  hardViolations: number;
}

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
  stagnationLimit: 20,
  targetFitness: 0.95,
  timeLimitMs: 15000,
  warmStartRatio: 0.2
};

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

export interface IEvolutionResult {
  bestScenario: ISchedulingScenario;
  finalGeneration: number;
  totalGenerations: number;
  progress: IEvolutionProgress;
  success: boolean;
  message: string;
}

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

export interface IConductorContext {
  startDate: Date;
  endDate: Date;
  shifts: IShift[];
  agents: IScheduleAgent[];
}

export interface IGenerationStats {
  generation: number;
  bestFitness: number;
  worstFitness: number;
  avgFitness: number;
  diversity: number;
}
