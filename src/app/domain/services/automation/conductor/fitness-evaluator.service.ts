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
import {
  CoreShift,
  CoreAgent,
  CoreScenario,
  calculateFitness as coreCalculateFitness,
  calculateFairness as coreCalculateFairness,
  calculateCoverage as coreCalculateCoverage,
  evaluateHardConstraints as coreEvaluateHardConstraints,
  evaluateSoftConstraints as coreEvaluateSoftConstraints
} from './evolution-core';

export interface IConstraintViolation {
  type: 'hard' | 'soft';
  agentId: string;
  description: string;
}

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
    const violations: IConstraintViolation[] = [];
    const shiftMap = new Map(shifts.map(s => [s.id, s]));
    const agentMap = new Map(agents.map(a => [a.id, a]));

    const agentDailyHours = new Map<string, Map<string, number>>();
    const agentTimeSlots = new Map<string, { date: string; start: string; end: string }[]>();

    for (const assignment of scenario.assignments) {
      const shift = shiftMap.get(assignment.shiftId);
      if (!shift) continue;

      const dateKey = shift.date instanceof Date
        ? shift.date.toISOString().split('T')[0]
        : String(shift.date).split('T')[0];

      if (!agentDailyHours.has(assignment.agentId)) {
        agentDailyHours.set(assignment.agentId, new Map());
      }
      const dailyMap = agentDailyHours.get(assignment.agentId)!;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + shift.hours);

      if (!agentTimeSlots.has(assignment.agentId)) {
        agentTimeSlots.set(assignment.agentId, []);
      }
      agentTimeSlots.get(assignment.agentId)!.push({
        date: dateKey,
        start: shift.startTime,
        end: shift.endTime
      });
    }

    const MAX_DAILY_HOURS = 10;
    for (const [agentId, dailyMap] of agentDailyHours) {
      for (const [dateKey, hours] of dailyMap) {
        if (hours > MAX_DAILY_HOURS) {
          violations.push({
            type: 'hard',
            agentId,
            description: `Agent exceeds ${MAX_DAILY_HOURS}h on ${dateKey} (${hours}h)`
          });
        }
      }
    }

    for (const [agentId, agent] of agentMap) {
      const dailyMap = agentDailyHours.get(agentId);
      if (!dailyMap) continue;

      const workedDates = Array.from(dailyMap.keys()).sort();
      let consecutive = 1;
      for (let i = 1; i < workedDates.length; i++) {
        const prev = new Date(workedDates[i - 1]);
        const curr = new Date(workedDates[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          consecutive++;
          if (consecutive > agent.maxConsecutiveDays) {
            violations.push({
              type: 'hard',
              agentId,
              description: `Agent exceeds max consecutive days (${consecutive} > ${agent.maxConsecutiveDays})`
            });
          }
        } else {
          consecutive = 1;
        }
      }
    }

    for (const [agentId, slots] of agentTimeSlots) {
      const agent = agentMap.get(agentId);
      if (!agent) continue;

      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          if (slots[i].date === slots[j].date) {
            if (slots[i].start < slots[j].end && slots[j].start < slots[i].end) {
              violations.push({
                type: 'hard',
                agentId,
                description: `Agent double-booked on ${slots[i].date}`
              });
            }
          }
        }
      }

      const sortedSlots = [...slots].sort((a, b) => {
        const cmp = a.date.localeCompare(b.date);
        return cmp !== 0 ? cmp : a.start.localeCompare(b.start);
      });

      for (let i = 1; i < sortedSlots.length; i++) {
        const prev = sortedSlots[i - 1];
        const curr = sortedSlots[i];

        const prevEndTime = new Date(`${prev.date}T${prev.end}`);
        const currStartTime = new Date(`${curr.date}T${curr.start}`);
        const pauseHours = (currStartTime.getTime() - prevEndTime.getTime()) / (1000 * 60 * 60);

        if (pauseHours > 0 && pauseHours < agent.minRestHours && prev.date !== curr.date) {
          violations.push({
            type: 'hard',
            agentId,
            description: `Agent rest period too short (${pauseHours.toFixed(1)}h < ${agent.minRestHours}h)`
          });
        }
      }
    }

    return violations;
  }

  evaluateSoftConstraints(
    scenario: ISchedulingScenario,
    shifts: IShift[],
    agents: IScheduleAgent[]
  ): IConstraintViolation[] {
    const violations: IConstraintViolation[] = [];
    const shiftMap = new Map(shifts.map(s => [s.id, s]));

    const agentHours = new Map<string, number>();
    for (const assignment of scenario.assignments) {
      const shift = shiftMap.get(assignment.shiftId);
      if (!shift) continue;
      agentHours.set(assignment.agentId, (agentHours.get(assignment.agentId) || 0) + shift.hours);
    }

    if (agentHours.size > 1) {
      const hours = Array.from(agentHours.values());
      const avg = hours.reduce((s, h) => s + h, 0) / hours.length;
      const maxDeviation = Math.max(...hours.map(h => Math.abs(h - avg)));
      if (avg > 0 && maxDeviation / avg > 0.5) {
        const worstAgent = Array.from(agentHours.entries())
          .sort((a, b) => Math.abs(b[1] - avg) - Math.abs(a[1] - avg))[0];
        violations.push({
          type: 'soft',
          agentId: worstAgent[0],
          description: `Hour distribution unfair (max deviation ${(maxDeviation / avg * 100).toFixed(0)}%)`
        });
      }
    }

    for (const agent of agents) {
      const totalHours = (agentHours.get(agent.id) || 0) + agent.currentHours;
      if (agent.guaranteedHours > 0 && totalHours > agent.guaranteedHours * 1.2) {
        violations.push({
          type: 'soft',
          agentId: agent.id,
          description: `Agent approaching overtime (${totalHours.toFixed(1)}h / ${agent.guaranteedHours}h guaranteed)`
        });
      }
    }

    for (const assignment of scenario.assignments) {
      if (assignment.motivationScore < 0.2) {
        violations.push({
          type: 'soft',
          agentId: assignment.agentId,
          description: `Low motivation for shift ${assignment.shiftId} (${(assignment.motivationScore * 100).toFixed(0)}%)`
        });
      }
    }

    return violations;
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
      motivation: agent.currentState.motivation
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
