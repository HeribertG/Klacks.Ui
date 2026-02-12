import { Injectable } from '@angular/core';
import {
  ISchedulingScenario,
  IShift,
  IFitnessWeights,
  DEFAULT_FITNESS_WEIGHTS
} from '../../../models/automation/conductor/scheduling.models';
import { IScheduleAgent } from '../../../models/automation/agent/schedule-agent.model';

@Injectable({
  providedIn: 'root'
})
export class FitnessEvaluatorService {
  private weights: IFitnessWeights = DEFAULT_FITNESS_WEIGHTS;

  setWeights(weights: Partial<IFitnessWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  calculateFitness(
    scenario: ISchedulingScenario,
    shifts: IShift[],
    agents: IScheduleAgent[]
  ): number {
    const coverageScore = this.calculateCoverage(scenario, shifts);
    const motivationScore = scenario.avgMotivation;
    const fairnessScore = this.calculateFairness(scenario, agents);
    const violationPenalty = Math.min(1, scenario.violationCount / 10);

    const fitness =
      coverageScore * this.weights.coverage +
      motivationScore * this.weights.motivation +
      fairnessScore * this.weights.fairness -
      violationPenalty * Math.abs(this.weights.violations);

    return Math.max(0, fitness);
  }

  calculateAverageMotivation(scenario: ISchedulingScenario): number {
    if (scenario.assignments.length === 0) return 0;

    const total = scenario.assignments.reduce((sum, a) => sum + a.motivationScore, 0);
    return total / scenario.assignments.length;
  }

  getWeights(): IFitnessWeights {
    return { ...this.weights };
  }

  private calculateCoverage(scenario: ISchedulingScenario, shifts: IShift[]): number {
    if (shifts.length === 0) return 1;

    let totalRequired = 0;
    let totalAssigned = 0;

    const shiftAssignmentCounts = new Map<string, number>();
    for (const assignment of scenario.assignments) {
      const count = shiftAssignmentCounts.get(assignment.shiftId) || 0;
      shiftAssignmentCounts.set(assignment.shiftId, count + 1);
    }

    for (const shift of shifts) {
      totalRequired += shift.requiredAssignments;
      const assigned = shiftAssignmentCounts.get(shift.id) || 0;
      totalAssigned += Math.min(assigned, shift.requiredAssignments);
    }

    return totalRequired > 0 ? totalAssigned / totalRequired : 1;
  }

  private calculateFairness(scenario: ISchedulingScenario, agents: IScheduleAgent[]): number {
    if (agents.length === 0 || scenario.assignments.length === 0) return 1;

    const hoursPerAgent = new Map<string, number>();
    for (const assignment of scenario.assignments) {
      const current = hoursPerAgent.get(assignment.agentId) || 0;
      hoursPerAgent.set(assignment.agentId, current + 1);
    }

    const hours = Array.from(hoursPerAgent.values());
    const avg = hours.reduce((sum, h) => sum + h, 0) / hours.length;

    if (avg === 0) return 1;

    const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avg;

    return Math.max(0, 1 - cv);
  }
}
