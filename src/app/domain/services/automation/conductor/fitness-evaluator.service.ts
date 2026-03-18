// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import {
  ISchedulingScenario,
  IShift,
  IFitnessWeights,
  DEFAULT_FITNESS_WEIGHTS,
  IPenaltyWeights,
  DEFAULT_PENALTY_WEIGHTS
} from '../../../models/automation/conductor/scheduling.models';
import { IScheduleAgent } from '../../../models/automation/agent/schedule-agent.model';
import { IConstraintViolation } from '../../../models/automation/conductor/constraint-violation.model';
import {
  CoreShift,
  CoreAgent,
  CoreScenario,
  calculateFitness as coreCalculateFitness,
  calculateFairness as coreCalculateFairness,
  calculateCoverage as coreCalculateCoverage
} from './evolution-core';
import {
  evaluateHardConstraintViolations,
  evaluateSoftConstraintViolations
} from './constraint-engine';

@Injectable({
  providedIn: 'root'
})
export class FitnessEvaluatorService {
  private weights: IFitnessWeights = DEFAULT_FITNESS_WEIGHTS;
  private penaltyWeights: IPenaltyWeights = DEFAULT_PENALTY_WEIGHTS;

  setWeights(weights: Partial<IFitnessWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  setPenaltyWeights(weights: Partial<IPenaltyWeights>): void {
    this.penaltyWeights = { ...this.penaltyWeights, ...weights };
  }

  calculateFitness(
    scenario: ISchedulingScenario,
    shifts: IShift[],
    agents: IScheduleAgent[]
  ): number {
    const coreScenario = this.toCoreScenario(scenario);
    const coreShifts = shifts.map(s => this.toCoreShift(s));
    const coreAgents = agents.map(a => this.toCoreAgent(a));

    coreCalculateFitness(coreScenario, coreShifts, coreAgents, this.penaltyWeights);

    scenario.penaltyScore = coreScenario.penaltyScore;
    scenario.hardViolations = coreScenario.hardViolations;
    scenario.fitness = coreScenario.fitness;
    scenario.coverage = coreScenario.coverage;

    return coreScenario.fitness;
  }

  calculatePenaltyFitness(
    scenario: ISchedulingScenario,
    shifts: IShift[],
    agents: IScheduleAgent[]
  ): {
    totalScore: number;
    normalizedFitness: number;
    hardViolationCount: number;
    softViolationCount: number;
    violations: IConstraintViolation[];
  } {
    const coreScenario = this.toCoreScenario(scenario);
    const coreShifts = shifts.map(s => this.toCoreShift(s));
    const coreAgents = agents.map(a => this.toCoreAgent(a));

    coreCalculateFitness(coreScenario, coreShifts, coreAgents, this.penaltyWeights);

    const hardViolations = this.evaluateHardConstraints(scenario, shifts, agents);
    const softViolations = this.evaluateSoftConstraints(scenario, shifts, agents);

    return {
      totalScore: coreScenario.penaltyScore,
      normalizedFitness: coreScenario.fitness,
      hardViolationCount: hardViolations.length,
      softViolationCount: softViolations.length,
      violations: [...hardViolations, ...softViolations]
    };
  }

  evaluateHardConstraints(
    scenario: ISchedulingScenario,
    shifts: IShift[],
    agents: IScheduleAgent[]
  ): IConstraintViolation[] {
    const coreShifts = shifts.map(s => this.toCoreShift(s));
    const coreAgents = agents.map(a => this.toCoreAgent(a));
    const coreAssignments = scenario.assignments.map(a => ({
      shiftId: a.shiftId,
      agentId: a.agentId,
      motivationScore: a.motivationScore
    }));
    return evaluateHardConstraintViolations(coreAssignments, coreShifts, coreAgents);
  }

  evaluateSoftConstraints(
    scenario: ISchedulingScenario,
    shifts: IShift[],
    agents: IScheduleAgent[]
  ): IConstraintViolation[] {
    const coreShifts = shifts.map(s => this.toCoreShift(s));
    const coreAgents = agents.map(a => this.toCoreAgent(a));
    const coreAssignments = scenario.assignments.map(a => ({
      shiftId: a.shiftId,
      agentId: a.agentId,
      motivationScore: a.motivationScore
    }));
    return evaluateSoftConstraintViolations(coreAssignments, coreShifts, coreAgents);
  }

  calculateAverageMotivation(scenario: ISchedulingScenario): number {
    if (scenario.assignments.length === 0) return 0;
    const total = scenario.assignments.reduce((sum, a) => sum + a.motivationScore, 0);
    return total / scenario.assignments.length;
  }

  getWeights(): IFitnessWeights {
    return { ...this.weights };
  }

  getPenaltyWeights(): IPenaltyWeights {
    return { ...this.penaltyWeights };
  }

  calculateCoverage(scenario: ISchedulingScenario, shifts: IShift[]): number {
    const coreScenario = this.toCoreScenario(scenario);
    const coreShifts = shifts.map(s => this.toCoreShift(s));
    return coreCalculateCoverage(coreScenario, coreShifts);
  }

  calculateFairness(scenario: ISchedulingScenario, agents: IScheduleAgent[]): number {
    const coreScenario = this.toCoreScenario(scenario);
    const coreAgents = agents.map(a => this.toCoreAgent(a));
    return coreCalculateFairness(coreScenario, coreAgents);
  }

  private toCoreShift(shift: IShift): CoreShift {
    return {
      id: shift.id,
      name: shift.name,
      date: shift.date instanceof Date ? shift.date.toISOString() : String(shift.date),
      startTime: shift.startTime,
      endTime: shift.endTime,
      hours: shift.hours,
      requiredAssignments: shift.requiredAssignments,
      priority: shift.priority
    };
  }

  private toCoreAgent(agent: IScheduleAgent): CoreAgent {
    return {
      id: agent.id,
      currentHours: agent.currentHours,
      guaranteedHours: agent.guaranteedHours,
      maxConsecutiveDays: agent.maxConsecutiveDays,
      minRestHours: agent.minRestHours,
      motivation: agent.currentState.motivation,
      maxDailyHours: agent.maxDailyHours,
      maxWeeklyHours: agent.maxWeeklyHours,
      maxOptimalGap: agent.maxOptimalGap
    };
  }

  private toCoreScenario(scenario: ISchedulingScenario): CoreScenario {
    return {
      id: scenario.id,
      assignments: scenario.assignments.map(a => ({
        shiftId: a.shiftId,
        agentId: a.agentId,
        motivationScore: a.motivationScore
      })),
      fitness: scenario.fitness,
      coverage: scenario.coverage,
      penaltyScore: scenario.penaltyScore,
      hardViolations: scenario.hardViolations
    };
  }
}
