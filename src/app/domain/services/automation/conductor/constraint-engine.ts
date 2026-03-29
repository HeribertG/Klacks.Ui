// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Shared constraint engine for hard and soft constraint evaluation.
 * Used by evolution-core (counters) and FitnessEvaluatorService (detail violations).
 * Orchestrates individual constraint checkers for hard constraints (DailyHours, WeeklyHours,
 * ConsecutiveDays, TimeOverlap, RestPeriod) and soft constraints (Fairness, Overtime,
 * Motivation, ShiftGap, ShiftConsistency).
 * @param scenario - Scenario with assignments (shiftId/agentId/motivationScore)
 * @param shifts - List of available shifts with times and hours
 * @param agents - List of agents with limits and configuration
 */

import { IConstraintViolation } from '../../../models/automation/conductor/constraint-violation.model';
import { SCHEDULING_CONSTANTS, EVOLUTION_CONSTANTS } from '../../../models/automation/automation-constants';

export interface ConstraintShift {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
}

export interface ConstraintAgent {
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

export interface ConstraintAssignment {
  shiftId: string;
  agentId: string;
  motivationScore: number;
}

interface TimeSlot {
  date: string;
  start: string;
  end: string;
}

function timeSlotsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && start2 < end1;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return monday.toISOString().split('T')[0];
}

function timeGapHours(end: string, start: string): number {
  const [eh, em] = end.split(':').map(Number);
  const [sh, sm] = start.split(':').map(Number);
  return (sh * 60 + sm - eh * 60 - em) / 60;
}

function buildAgentAggregations(
  assignments: ConstraintAssignment[],
  shiftMap: Map<string, ConstraintShift>
): { agentDailyHours: Map<string, Map<string, number>>; agentTimeSlots: Map<string, TimeSlot[]> } {
  const agentDailyHours = new Map<string, Map<string, number>>();
  const agentTimeSlots = new Map<string, TimeSlot[]>();

  for (const assignment of assignments) {
    const shift = shiftMap.get(assignment.shiftId);
    if (!shift) continue;

    const dateKey = shift.date.split('T')[0];

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

  return { agentDailyHours, agentTimeSlots };
}

function checkDailyHoursConstraint(
  agentDailyHours: Map<string, Map<string, number>>,
  agentMap: Map<string, ConstraintAgent>
): IConstraintViolation[] {
  const violations: IConstraintViolation[] = [];

  for (const [agentId, dailyMap] of agentDailyHours) {
    const agent = agentMap.get(agentId);
    if (!agent) continue;

    for (const [dateKey, hours] of dailyMap) {
      if (hours > agent.maxDailyHours) {
        violations.push({
          type: 'hard',
          agentId,
          description: `Agent exceeds ${agent.maxDailyHours}h on ${dateKey} (${hours}h)`
        });
      }
    }
  }

  return violations;
}

function checkWeeklyHoursConstraint(
  agentDailyHours: Map<string, Map<string, number>>,
  agentMap: Map<string, ConstraintAgent>
): IConstraintViolation[] {
  const violations: IConstraintViolation[] = [];

  for (const [agentId, dailyMap] of agentDailyHours) {
    const agent = agentMap.get(agentId);
    if (!agent) continue;

    const weeklyHours = new Map<string, number>();
    for (const [dateKey, hours] of dailyMap) {
      const wk = getWeekKey(dateKey);
      weeklyHours.set(wk, (weeklyHours.get(wk) || 0) + hours);
    }
    for (const [weekKey, hours] of weeklyHours) {
      if (hours > agent.maxWeeklyHours) {
        violations.push({
          type: 'hard',
          agentId,
          description: `Agent exceeds ${agent.maxWeeklyHours}h in week ${weekKey} (${hours}h)`
        });
      }
    }
  }

  return violations;
}

function checkConsecutiveDaysConstraint(
  agentDailyHours: Map<string, Map<string, number>>,
  agentMap: Map<string, ConstraintAgent>
): IConstraintViolation[] {
  const violations: IConstraintViolation[] = [];

  for (const [agentId, dailyMap] of agentDailyHours) {
    const agent = agentMap.get(agentId);
    if (!agent) continue;

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

  return violations;
}

function checkTimeOverlapConstraint(
  agentTimeSlots: Map<string, TimeSlot[]>,
  agentMap: Map<string, ConstraintAgent>
): IConstraintViolation[] {
  const violations: IConstraintViolation[] = [];

  for (const [agentId, slots] of agentTimeSlots) {
    const agent = agentMap.get(agentId);
    if (!agent) continue;

    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (slots[i].date === slots[j].date) {
          if (timeSlotsOverlap(slots[i].start, slots[i].end, slots[j].start, slots[j].end)) {
            violations.push({
              type: 'hard',
              agentId,
              description: `Agent double-booked on ${slots[i].date}`
            });
          }
        }
      }
    }
  }

  return violations;
}

function checkRestPeriodConstraint(
  agentTimeSlots: Map<string, TimeSlot[]>,
  agentMap: Map<string, ConstraintAgent>
): IConstraintViolation[] {
  const violations: IConstraintViolation[] = [];

  for (const [agentId, slots] of agentTimeSlots) {
    const agent = agentMap.get(agentId);
    if (!agent) continue;

    const sortedSlots = [...slots].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return cmp !== 0 ? cmp : a.start.localeCompare(b.start);
    });
    for (let i = 1; i < sortedSlots.length; i++) {
      const prev = sortedSlots[i - 1];
      const curr = sortedSlots[i];
      let prevEnd = new Date(`${prev.date}T${prev.end}`);
      if (prev.end <= prev.start) prevEnd = new Date(prevEnd.getTime() + EVOLUTION_CONSTANTS.MS_PER_DAY);
      const currStart = new Date(`${curr.date}T${curr.start}`);
      const pauseHours = (currStart.getTime() - prevEnd.getTime()) / EVOLUTION_CONSTANTS.MS_PER_HOUR;
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

export function evaluateHardConstraintViolations(
  assignments: ConstraintAssignment[],
  shifts: ConstraintShift[],
  agents: ConstraintAgent[]
): IConstraintViolation[] {
  const shiftMap = new Map(shifts.map(s => [s.id, s]));
  const agentMap = new Map(agents.map(a => [a.id, a]));
  const { agentDailyHours, agentTimeSlots } = buildAgentAggregations(assignments, shiftMap);

  return [
    ...checkDailyHoursConstraint(agentDailyHours, agentMap),
    ...checkWeeklyHoursConstraint(agentDailyHours, agentMap),
    ...checkConsecutiveDaysConstraint(agentDailyHours, agentMap),
    ...checkTimeOverlapConstraint(agentTimeSlots, agentMap),
    ...checkRestPeriodConstraint(agentTimeSlots, agentMap),
  ];
}

function checkFairnessConstraint(
  agentHours: Map<string, number>
): IConstraintViolation[] {
  if (agentHours.size <= 1) return [];

  const violations: IConstraintViolation[] = [];
  const hours = Array.from(agentHours.values());
  const avg = hours.reduce((s, h) => s + h, 0) / hours.length;
  const maxDev = Math.max(...hours.map(h => Math.abs(h - avg)));
  if (avg > 0 && maxDev / avg > SCHEDULING_CONSTANTS.FAIRNESS_MAX_DEVIATION_RATIO) {
    const worstAgent = Array.from(agentHours.entries())
      .sort((a, b) => Math.abs(b[1] - avg) - Math.abs(a[1] - avg))[0];
    violations.push({
      type: 'soft',
      agentId: worstAgent[0],
      description: `Hour distribution unfair (max deviation ${(maxDev / avg * 100).toFixed(0)}%)`
    });
  }

  return violations;
}

function checkOvertimeConstraint(
  agents: ConstraintAgent[],
  agentHours: Map<string, number>
): IConstraintViolation[] {
  const violations: IConstraintViolation[] = [];

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

  return violations;
}

function checkLowMotivationConstraint(
  assignments: ConstraintAssignment[]
): IConstraintViolation[] {
  const violations: IConstraintViolation[] = [];

  for (const a of assignments) {
    if (a.motivationScore < SCHEDULING_CONSTANTS.LOW_MOTIVATION_THRESHOLD) {
      violations.push({
        type: 'soft',
        agentId: a.agentId,
        description: `Low motivation for shift ${a.shiftId} (${(a.motivationScore * 100).toFixed(0)}%)`
      });
    }
  }

  return violations;
}

function checkShiftGapConstraint(
  agentDailySlots: Map<string, Map<string, { start: string; end: string; name: string }[]>>,
  agentMap: Map<string, ConstraintAgent>
): IConstraintViolation[] {
  const violations: IConstraintViolation[] = [];

  for (const [agentId, dailyMap] of agentDailySlots) {
    const agent = agentMap.get(agentId);
    if (!agent) continue;

    for (const [dateKey, slots] of dailyMap) {
      if (slots.length < 2) continue;
      slots.sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 1; i < slots.length; i++) {
        const gap = timeGapHours(slots[i - 1].end, slots[i].start);
        if (gap > agent.maxOptimalGap) {
          violations.push({
            type: 'soft',
            agentId,
            description: `Gap between shifts on ${dateKey} is ${gap.toFixed(1)}h (max ${agent.maxOptimalGap}h)`
          });
        }
      }
    }
  }

  return violations;
}

function checkShiftConsistencyConstraint(
  agentDailySlots: Map<string, Map<string, { start: string; end: string; name: string }[]>>
): IConstraintViolation[] {
  const violations: IConstraintViolation[] = [];

  for (const [agentId, dailyMap] of agentDailySlots) {
    const dates = Array.from(dailyMap.keys()).sort();
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / EVOLUTION_CONSTANTS.MS_PER_DAY;
      if (diffDays === 1) {
        const prevName = dailyMap.get(dates[i - 1])![0].name;
        const currName = dailyMap.get(dates[i])![0].name;
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

export function evaluateSoftConstraintViolations(
  assignments: ConstraintAssignment[],
  shifts: ConstraintShift[],
  agents: ConstraintAgent[]
): IConstraintViolation[] {
  const shiftMap = new Map(shifts.map(s => [s.id, s]));

  const agentHours = new Map<string, number>();
  for (const a of assignments) {
    const shift = shiftMap.get(a.shiftId);
    if (shift) {
      agentHours.set(a.agentId, (agentHours.get(a.agentId) || 0) + shift.hours);
    }
  }

  const agentDailySlots = new Map<string, Map<string, { start: string; end: string; name: string }[]>>();
  for (const a of assignments) {
    const shift = shiftMap.get(a.shiftId);
    if (!shift) continue;
    const dateKey = shift.date.split('T')[0];
    if (!agentDailySlots.has(a.agentId)) agentDailySlots.set(a.agentId, new Map());
    const dailyMap = agentDailySlots.get(a.agentId)!;
    if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, []);
    dailyMap.get(dateKey)!.push({ start: shift.startTime, end: shift.endTime, name: shift.name });
  }

  const agentMap = new Map(agents.map(a => [a.id, a]));

  return [
    ...checkFairnessConstraint(agentHours),
    ...checkOvertimeConstraint(agents, agentHours),
    ...checkLowMotivationConstraint(assignments),
    ...checkShiftGapConstraint(agentDailySlots, agentMap),
    ...checkShiftConsistencyConstraint(agentDailySlots),
  ];
}
