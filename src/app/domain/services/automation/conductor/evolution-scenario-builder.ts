// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Initial-population builders for the evolutionary engine: a purely random
 * scenario and a greedy warm-start scenario with selectable scoring strategy.
 * @param shifts - Shifts to assign
 * @param agents - Available agents
 * @param variation - Greedy shuffle amount (0 = deterministic ordering)
 * @param rng - Random source (draw order must stay stable)
 * @param strategy - Greedy scoring profile (balanced | deficit | consistency)
 */

import {
  SCHEDULING_CONSTANTS,
  EVOLUTION_CONSTANTS,
  AGENT_STATE_CONSTANTS,
} from '../../../models/automation/automation-constants';
import {
  CoreShift,
  CoreAgent,
  CoreAssignment,
  CoreScenario,
  RngFn,
} from './evolution-types';
import { generateId } from './evolution-rng';

function getPreviousDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function createRandomScenario(
  shifts: CoreShift[],
  agents: CoreAgent[],
  rng: RngFn,
): CoreScenario {
  const assignments: CoreAssignment[] = [];
  for (const shift of shifts) {
    if (rng() < SCHEDULING_CONSTANTS.RANDOM_ASSIGNMENT_PROBABILITY) {
      const agent = agents[Math.floor(rng() * agents.length)];
      assignments.push({
        shiftId: shift.id,
        agentId: agent.id,
        motivationScore:
          agent.motivation *
          (AGENT_STATE_CONSTANTS.DEFAULT_SATISFACTION +
            rng() * AGENT_STATE_CONSTANTS.DEFAULT_SATISFACTION),
      });
    }
  }
  return {
    id: generateId(rng),
    assignments,
    fitness: 0,
    coverage: 0,
    penaltyScore: 0,
    hardViolations: 0,
  };
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

function countConsecutiveDaysEnding(
  workedDates: Set<string>,
  targetDate: string,
): number {
  let count = 0;
  const d = new Date(targetDate);
  d.setDate(d.getDate() - 1);
  while (workedDates.has(d.toISOString().split('T')[0])) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

export type GreedyStrategy = 'balanced' | 'deficit' | 'consistency';

const STRATEGY_WEIGHTS: Record<GreedyStrategy, { deficit: number; motivation: number; consistency: number; restPenalty: number }> = {
  balanced:    { deficit: EVOLUTION_CONSTANTS.GREEDY_HOUR_DEFICIT_WEIGHT, motivation: EVOLUTION_CONSTANTS.GREEDY_MOTIVATION_WEIGHT, consistency: EVOLUTION_CONSTANTS.GREEDY_BLOCK_CONSISTENCY_WEIGHT, restPenalty: -500 },
  deficit:     { deficit: EVOLUTION_CONSTANTS.GREEDY_HOUR_DEFICIT_WEIGHT * 3, motivation: EVOLUTION_CONSTANTS.GREEDY_MOTIVATION_WEIGHT * 0.5, consistency: EVOLUTION_CONSTANTS.GREEDY_BLOCK_CONSISTENCY_WEIGHT * 0.5, restPenalty: -300 },
  consistency: { deficit: EVOLUTION_CONSTANTS.GREEDY_HOUR_DEFICIT_WEIGHT, motivation: EVOLUTION_CONSTANTS.GREEDY_MOTIVATION_WEIGHT * 0.5, consistency: EVOLUTION_CONSTANTS.GREEDY_BLOCK_CONSISTENCY_WEIGHT * 4, restPenalty: -500 },
};

interface StrategyWeights { deficit: number; motivation: number; consistency: number; restPenalty: number }

function scoreAgentForShift(
  agent: CoreAgent,
  shift: CoreShift,
  dateKey: string,
  sw: StrategyWeights,
  agentScheduledHours: Map<string, number>,
  agentLastEnd: Map<string, number>,
  agentWorkedDates: Map<string, Set<string>>,
  agentDailyShiftNames: Map<string, Map<string, string>>,
): number {
  let restPenalty = 0;
  const lastEnd = agentLastEnd.get(agent.id);
  if (lastEnd !== undefined) {
    const currStartMs = new Date(`${dateKey}T${shift.startTime}`).getTime();
    const restHours =
      (currStartMs - lastEnd) / EVOLUTION_CONSTANTS.MS_PER_HOUR;
    if (restHours > 0 && restHours < agent.minRestHours) restPenalty = sw.restPenalty;
  }

  let consecutivePenalty = 0;
  const workedDates = agentWorkedDates.get(agent.id);
  if (workedDates) {
    const consecutive = countConsecutiveDaysEnding(workedDates, dateKey);
    if (
      consecutive >= agent.maxConsecutiveDays &&
      !workedDates.has(dateKey)
    )
      consecutivePenalty = -50;
    else if (
      consecutive >= agent.maxConsecutiveDays - 1 &&
      !workedDates.has(dateKey)
    )
      consecutivePenalty = -20;
  }

  const totalHours = agentScheduledHours.get(agent.id) || 0;
  const hourDeficit =
    agent.guaranteedHours - (agent.currentHours + totalHours);
  const prevDayKey = getPreviousDayKey(dateKey);
  const prevShiftName = agentDailyShiftNames.get(agent.id)?.get(prevDayKey);
  const blockBonus = prevShiftName === shift.name ? sw.consistency : 0;

  return (
    hourDeficit * sw.deficit +
    agent.motivation * sw.motivation -
    totalHours +
    blockBonus +
    consecutivePenalty +
    restPenalty
  );
}

function checkSlotConstraints(
  agent: CoreAgent,
  shift: CoreShift,
  agentDailySlots: Map<string, { start: string; end: string }[]>,
  dateKey: string,
): boolean {
  const dailyKey = `${agent.id}_${dateKey}`;
  const existingSlots = agentDailySlots.get(dailyKey);
  if (!existingSlots) return false;
  for (const slot of existingSlots) {
    if (shift.startTime < slot.end && slot.start < shift.endTime) {
      return true;
    }
  }
  return false;
}

function updateAgentTracking(
  agent: CoreAgent,
  shift: CoreShift,
  dateKey: string,
  weekKey: string,
  agentScheduledHours: Map<string, number>,
  agentDailyHours: Map<string, number>,
  agentWeeklyHours: Map<string, number>,
  agentDailySlots: Map<string, { start: string; end: string }[]>,
  agentDailyShiftNames: Map<string, Map<string, string>>,
  agentLastEnd: Map<string, number>,
  agentWorkedDates: Map<string, Set<string>>,
): void {
  agentScheduledHours.set(
    agent.id,
    (agentScheduledHours.get(agent.id) || 0) + shift.hours,
  );

  const dailyKey = `${agent.id}_${dateKey}`;
  agentDailyHours.set(
    dailyKey,
    (agentDailyHours.get(dailyKey) || 0) + shift.hours,
  );

  const wkKey = `${agent.id}_${weekKey}`;
  agentWeeklyHours.set(
    wkKey,
    (agentWeeklyHours.get(wkKey) || 0) + shift.hours,
  );

  if (!agentDailySlots.has(dailyKey)) agentDailySlots.set(dailyKey, []);
  agentDailySlots
    .get(dailyKey)!
    .push({ start: shift.startTime, end: shift.endTime });

  if (!agentDailyShiftNames.has(agent.id))
    agentDailyShiftNames.set(agent.id, new Map());
  agentDailyShiftNames.get(agent.id)!.set(dateKey, shift.name);

  let shiftEndMs = new Date(`${dateKey}T${shift.endTime}`).getTime();
  if (shift.endTime <= shift.startTime)
    shiftEndMs += EVOLUTION_CONSTANTS.MS_PER_DAY;
  const prevEnd = agentLastEnd.get(agent.id);
  if (prevEnd === undefined || shiftEndMs > prevEnd)
    agentLastEnd.set(agent.id, shiftEndMs);

  if (!agentWorkedDates.has(agent.id))
    agentWorkedDates.set(agent.id, new Set());
  agentWorkedDates.get(agent.id)!.add(dateKey);
}

export function createGreedyScenario(
  shifts: CoreShift[],
  agents: CoreAgent[],
  variation: number,
  rng: RngFn,
  strategy: GreedyStrategy = 'balanced',
): CoreScenario {
  const sw = STRATEGY_WEIGHTS[strategy];
  const assignments: CoreAssignment[] = [];
  const agentScheduledHours = new Map<string, number>();
  const agentDailyHours = new Map<string, number>();
  const agentWeeklyHours = new Map<string, number>();
  const agentDailySlots = new Map<string, { start: string; end: string }[]>();
  const agentDailyShiftNames = new Map<string, Map<string, string>>();
  const agentLastEnd = new Map<string, number>();
  const agentWorkedDates = new Map<string, Set<string>>();

  const sortedShifts = [...shifts].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime) ||
      b.priority - a.priority,
  );
  if (variation > 0) {
    for (let i = sortedShifts.length - 1; i > 0; i--) {
      if (rng() < variation * EVOLUTION_CONSTANTS.GREEDY_SHUFFLE_FACTOR) {
        const j = Math.floor(rng() * (i + 1));
        [sortedShifts[i], sortedShifts[j]] = [sortedShifts[j], sortedShifts[i]];
      }
    }
  }

  const sortedAgents = [...agents].sort(
    (a, b) => b.guaranteedHours - a.guaranteedHours,
  );

  for (const shift of sortedShifts) {
    const dateKey = shift.date.split('T')[0];
    const weekKey = getWeekKey(dateKey);
    let bestAgent: CoreAgent | null = null;
    let bestScore = -Infinity;

    for (const agent of sortedAgents) {
      const dailyKey = `${agent.id}_${dateKey}`;
      const dailyHrs = agentDailyHours.get(dailyKey) || 0;
      if (dailyHrs + shift.hours > agent.maxDailyHours) continue;

      const wkKey = `${agent.id}_${weekKey}`;
      const weeklyHrs = agentWeeklyHours.get(wkKey) || 0;
      if (weeklyHrs + shift.hours > agent.maxWeeklyHours) continue;

      if (checkSlotConstraints(agent, shift, agentDailySlots, dateKey)) continue;

      const score = scoreAgentForShift(
        agent, shift, dateKey, sw,
        agentScheduledHours, agentLastEnd, agentWorkedDates, agentDailyShiftNames,
      );
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    if (bestAgent) {
      assignments.push({
        shiftId: shift.id,
        agentId: bestAgent.id,
        motivationScore: bestAgent.motivation,
      });
      updateAgentTracking(
        bestAgent, shift, dateKey, weekKey,
        agentScheduledHours, agentDailyHours, agentWeeklyHours,
        agentDailySlots, agentDailyShiftNames, agentLastEnd, agentWorkedDates,
      );
    }
  }

  return {
    id: generateId(rng),
    assignments,
    fitness: 0,
    coverage: 0,
    penaltyScore: 0,
    hardViolations: 0,
  };
}
