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
import { SCHEDULING_CONSTANTS, EVOLUTION_CONSTANTS } from '../../../models/automation/automation-constants';

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

    for (const [agentId, dailyMap] of agentDailyHours) {
      const agent = agentMap.get(agentId);
      const maxDaily = agent?.maxDailyHours ?? 10;
      for (const [dateKey, hours] of dailyMap) {
        if (hours > maxDaily) {
          violations.push({
            type: 'hard',
            agentId,
            description: `Agent exceeds ${maxDaily}h on ${dateKey} (${hours}h)`
          });
        }
      }

      const weeklyHours = new Map<string, number>();
      for (const [dateKey, hours] of dailyMap) {
        const wk = this.getWeekKey(dateKey);
        weeklyHours.set(wk, (weeklyHours.get(wk) || 0) + hours);
      }
      const maxWeekly = agent?.maxWeeklyHours ?? 50;
      for (const [weekKey, hours] of weeklyHours) {
        if (hours > maxWeekly) {
          violations.push({
            type: 'hard',
            agentId,
            description: `Agent exceeds ${maxWeekly}h in week ${weekKey} (${hours}h)`
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
        const diffDays = (curr.getTime() - prev.getTime()) / EVOLUTION_CONSTANTS.MS_PER_DAY;

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
        const pauseHours = (currStartTime.getTime() - prevEndTime.getTime()) / EVOLUTION_CONSTANTS.MS_PER_HOUR;

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
      if (avg > 0 && maxDeviation / avg > SCHEDULING_CONSTANTS.FAIRNESS_MAX_DEVIATION_RATIO) {
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
      if (agent.guaranteedHours > 0 && totalHours > agent.guaranteedHours * SCHEDULING_CONSTANTS.OVERTIME_THRESHOLD_FACTOR) {
        violations.push({
          type: 'soft',
          agentId: agent.id,
          description: `Agent approaching overtime (${totalHours.toFixed(1)}h / ${agent.guaranteedHours}h guaranteed)`
        });
      }
    }

    for (const assignment of scenario.assignments) {
      if (assignment.motivationScore < SCHEDULING_CONSTANTS.LOW_MOTIVATION_THRESHOLD) {
        violations.push({
          type: 'soft',
          agentId: assignment.agentId,
          description: `Low motivation for shift ${assignment.shiftId} (${(assignment.motivationScore * 100).toFixed(0)}%)`
        });
      }
    }

    const agentDailySlots = new Map<string, Map<string, { start: string; end: string; name: string }[]>>();
    for (const assignment of scenario.assignments) {
      const shift = shiftMap.get(assignment.shiftId);
      if (!shift) continue;
      const dateKey = shift.date instanceof Date
        ? shift.date.toISOString().split('T')[0]
        : String(shift.date).split('T')[0];
      if (!agentDailySlots.has(assignment.agentId)) agentDailySlots.set(assignment.agentId, new Map());
      const dailySlotMap = agentDailySlots.get(assignment.agentId)!;
      if (!dailySlotMap.has(dateKey)) dailySlotMap.set(dateKey, []);
      dailySlotMap.get(dateKey)!.push({ start: shift.startTime, end: shift.endTime, name: shift.name });
    }

    const agentMapSoft = new Map(agents.map(a => [a.id, a]));
    for (const [agentId, dailySlotMap] of agentDailySlots) {
      const agent = agentMapSoft.get(agentId);
      if (!agent) continue;

      for (const [dateKey, slots] of dailySlotMap) {
        if (slots.length < 2) continue;
        slots.sort((a, b) => a.start.localeCompare(b.start));
        for (let i = 1; i < slots.length; i++) {
          const gap = this.timeGapHours(slots[i - 1].end, slots[i].start);
          if (gap > agent.maxOptimalGap) {
            violations.push({
              type: 'soft',
              agentId,
              description: `Gap between shifts on ${dateKey} is ${gap.toFixed(1)}h (max ${agent.maxOptimalGap}h)`
            });
          }
        }
      }

      const dates = Array.from(dailySlotMap.keys()).sort();
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / EVOLUTION_CONSTANTS.MS_PER_HOUR / 24;
        if (Math.round(diffDays) === 1) {
          const prevName = dailySlotMap.get(dates[i - 1])![0].name;
          const currName = dailySlotMap.get(dates[i])![0].name;
          if (prevName !== currName) {
            violations.push({
              type: 'soft',
              agentId,
              description: `Shift inconsistency: ${prevName} on ${dates[i - 1]} vs ${currName} on ${dates[i]}`
            });
          }
        }
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
      motivation: agent.currentState.motivation,
      maxDailyHours: agent.maxDailyHours,
      maxWeeklyHours: agent.maxWeeklyHours,
      maxOptimalGap: agent.maxOptimalGap
    };
  }

  private getWeekKey(dateStr: string): string {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    return monday.toISOString().split('T')[0];
  }

  private timeGapHours(end: string, start: string): number {
    const [eh, em] = end.split(':').map(Number);
    const [sh, sm] = start.split(':').map(Number);
    return (sh * 60 + sm - eh * 60 - em) / 60;
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
