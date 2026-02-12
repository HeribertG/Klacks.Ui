import { IScheduleAgent, IAgentDecision } from '../agent/schedule-agent.model';

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
}

export interface IEvolutionConfig {
  populationSize: number;
  maxGenerations: number;
  eliteCount: number;
  mutationRate: number;
  crossoverRate: number;
  convergenceThreshold: number;
  randomSeed?: number;
}

export const DEFAULT_EVOLUTION_CONFIG: IEvolutionConfig = {
  populationSize: 50,
  maxGenerations: 100,
  eliteCount: 5,
  mutationRate: 0.1,
  crossoverRate: 0.8,
  convergenceThreshold: 0.001
};

export interface IEvolutionProgress {
  currentGeneration: number;
  maxGenerations: number;
  bestFitness: number;
  avgFitness: number;
  coverage: number;
  isConverged: boolean;
  improvement: number;
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
