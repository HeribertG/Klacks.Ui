// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  SCHEDULING_CONSTANTS,
  EVOLUTION_CONSTANTS,
  AGENT_STATE_CONSTANTS,
} from '../../../models/automation/automation-constants';
import {
  evaluateHardConstraintViolations,
  evaluateSoftConstraintViolations,
} from './constraint-engine';

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

export function createSeededRng(seed: number): RngFn {
  let state = seed;
  return () => {
    state =
      (state * EVOLUTION_CONSTANTS.RNG_MULTIPLIER +
        EVOLUTION_CONSTANTS.RNG_INCREMENT) %
      EVOLUTION_CONSTANTS.RNG_MODULUS;
    return state / EVOLUTION_CONSTANTS.RNG_MODULUS;
  };
}

export function generateId(rng: RngFn): string {
  return (
    'evo_' +
    Date.now() +
    '_' +
    Math.floor(rng() * EVOLUTION_CONSTANTS.ID_RANDOM_RANGE)
  );
}

function getPreviousDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function evaluateHardConstraints(
  scenario: CoreScenario,
  shifts: CoreShift[],
  agents: CoreAgent[],
): number {
  return evaluateHardConstraintViolations(scenario.assignments, shifts, agents)
    .length;
}

export function evaluateSoftConstraints(
  scenario: CoreScenario,
  shifts: CoreShift[],
  agents: CoreAgent[],
): number {
  return evaluateSoftConstraintViolations(scenario.assignments, shifts, agents)
    .length;
}

export function calculateFitness(
  scenario: CoreScenario,
  shifts: CoreShift[],
  agents: CoreAgent[],
  weights: CorePenaltyWeights,
): void {
  let totalScore = 0;

  const assignedShiftIds = new Set(scenario.assignments.map((a) => a.shiftId));
  let coveredCount = 0;
  for (const shift of shifts) {
    if (assignedShiftIds.has(shift.id)) coveredCount++;
  }
  const uncoveredCount = shifts.length - coveredCount;
  totalScore += coveredCount * weights.coverageBonus;
  totalScore += uncoveredCount * weights.uncoveredPenalty;

  const avgMotivation =
    scenario.assignments.length > 0
      ? scenario.assignments.reduce((sum, a) => sum + a.motivationScore, 0) /
        scenario.assignments.length
      : 0;
  totalScore +=
    avgMotivation * weights.motivationBonus * scenario.assignments.length;

  if (agents.length > 0 && scenario.assignments.length > 0) {
    const fairness = calculateFairness(scenario, agents);
    totalScore += fairness * weights.fairnessBonus * agents.length;
  }

  const hardCount = evaluateHardConstraints(scenario, shifts, agents);
  totalScore += hardCount * weights.hardViolation;

  const softCount = evaluateSoftConstraints(scenario, shifts, agents);
  totalScore += softCount * weights.softViolation;

  const maxPossible =
    shifts.length * weights.coverageBonus +
    weights.motivationBonus * shifts.length +
    weights.fairnessBonus * agents.length -
    shifts.length * weights.uncoveredPenalty;

  scenario.penaltyScore = totalScore;
  scenario.hardViolations = hardCount;
  scenario.fitness =
    maxPossible > 0 ? Math.max(0, Math.min(1, totalScore / maxPossible)) : 0;
  scenario.coverage = shifts.length > 0 ? coveredCount / shifts.length : 1;
}

export function calculateFairness(
  scenario: CoreScenario,
  agents: CoreAgent[],
): number {
  if (agents.length === 0 || scenario.assignments.length === 0) return 1;

  const hoursPerAgent = new Map<string, number>();
  for (const a of scenario.assignments) {
    hoursPerAgent.set(a.agentId, (hoursPerAgent.get(a.agentId) || 0) + 1);
  }

  const hours = Array.from(hoursPerAgent.values());
  const avg = hours.reduce((s, h) => s + h, 0) / hours.length;
  if (avg === 0) return 1;

  const cv =
    Math.sqrt(
      hours.reduce((s, h) => s + Math.pow(h - avg, 2), 0) / hours.length,
    ) / avg;
  return Math.max(0, 1 - cv);
}

export function calculateCoverage(
  scenario: CoreScenario,
  shifts: CoreShift[],
): number {
  if (shifts.length === 0) return 1;

  const shiftAssignmentCounts = new Map<string, number>();
  for (const a of scenario.assignments) {
    shiftAssignmentCounts.set(
      a.shiftId,
      (shiftAssignmentCounts.get(a.shiftId) || 0) + 1,
    );
  }

  let totalRequired = 0;
  let totalAssigned = 0;
  for (const shift of shifts) {
    totalRequired += shift.requiredAssignments;
    const assigned = shiftAssignmentCounts.get(shift.id) || 0;
    totalAssigned += Math.min(assigned, shift.requiredAssignments);
  }

  return totalRequired > 0 ? totalAssigned / totalRequired : 1;
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

      const existingSlots = agentDailySlots.get(dailyKey);
      if (existingSlots) {
        let overlaps = false;
        for (const slot of existingSlots) {
          if (shift.startTime < slot.end && slot.start < shift.endTime) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) continue;
      }

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

      const score =
        hourDeficit * sw.deficit +
        agent.motivation * sw.motivation -
        totalHours +
        blockBonus +
        consecutivePenalty +
        restPenalty;
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
      agentScheduledHours.set(
        bestAgent.id,
        (agentScheduledHours.get(bestAgent.id) || 0) + shift.hours,
      );

      const dailyKey = `${bestAgent.id}_${dateKey}`;
      agentDailyHours.set(
        dailyKey,
        (agentDailyHours.get(dailyKey) || 0) + shift.hours,
      );

      const wkKey = `${bestAgent.id}_${weekKey}`;
      agentWeeklyHours.set(
        wkKey,
        (agentWeeklyHours.get(wkKey) || 0) + shift.hours,
      );

      if (!agentDailySlots.has(dailyKey)) agentDailySlots.set(dailyKey, []);
      agentDailySlots
        .get(dailyKey)!
        .push({ start: shift.startTime, end: shift.endTime });

      if (!agentDailyShiftNames.has(bestAgent.id))
        agentDailyShiftNames.set(bestAgent.id, new Map());
      agentDailyShiftNames.get(bestAgent.id)!.set(dateKey, shift.name);

      let shiftEndMs = new Date(`${dateKey}T${shift.endTime}`).getTime();
      if (shift.endTime <= shift.startTime)
        shiftEndMs += EVOLUTION_CONSTANTS.MS_PER_DAY;
      const prevEnd = agentLastEnd.get(bestAgent.id);
      if (prevEnd === undefined || shiftEndMs > prevEnd)
        agentLastEnd.set(bestAgent.id, shiftEndMs);

      if (!agentWorkedDates.has(bestAgent.id))
        agentWorkedDates.set(bestAgent.id, new Set());
      agentWorkedDates.get(bestAgent.id)!.add(dateKey);
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

export function mutateSwap(
  assignments: CoreAssignment[],
  agents: CoreAgent[],
  rng: RngFn,
): void {
  if (assignments.length === 0) return;
  const idx = Math.floor(rng() * assignments.length);
  const newAgent = agents[Math.floor(rng() * agents.length)];
  assignments[idx] = { ...assignments[idx], agentId: newAgent.id };
}

export function mutateRemove(assignments: CoreAssignment[], rng: RngFn): void {
  if (assignments.length === 0) return;
  assignments.splice(Math.floor(rng() * assignments.length), 1);
}

export function mutateRepair(
  assignments: CoreAssignment[],
  agents: CoreAgent[],
  rng: RngFn,
): void {
  const agentCounts = new Map<string, number>();
  for (const a of assignments) {
    agentCounts.set(a.agentId, (agentCounts.get(a.agentId) || 0) + 1);
  }

  let maxCount = 0;
  let overloaded = '';
  for (const [id, count] of agentCounts) {
    if (count > maxCount) {
      maxCount = count;
      overloaded = id;
    }
  }

  if (!overloaded) return;

  const underloaded = agents
    .filter(
      (a) => (agentCounts.get(a.id) || 0) < maxCount && a.id !== overloaded,
    )
    .sort(
      (a, b) => (agentCounts.get(a.id) || 0) - (agentCounts.get(b.id) || 0),
    );

  if (underloaded.length === 0) return;

  const targets = assignments
    .map((a, i) => ({ a, i }))
    .filter((x) => x.a.agentId === overloaded);

  if (targets.length === 0) return;

  const target = targets[Math.floor(rng() * targets.length)];
  assignments[target.i] = {
    ...assignments[target.i],
    agentId: underloaded[0].id,
  };
}

export function mutateHungryFirst(
  assignments: CoreAssignment[],
  shifts: CoreShift[],
  agents: CoreAgent[],
  rng: RngFn,
): void {
  const shiftMap = new Map(shifts.map((s) => [s.id, s]));
  const agentHours = new Map<string, number>();
  for (const a of assignments) {
    const s = shiftMap.get(a.shiftId);
    if (s)
      agentHours.set(a.agentId, (agentHours.get(a.agentId) || 0) + s.hours);
  }

  let hungriest: CoreAgent | null = null;
  let maxDeficit = -Infinity;
  for (const agent of agents) {
    const deficit =
      agent.guaranteedHours -
      (agent.currentHours + (agentHours.get(agent.id) || 0));
    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      hungriest = agent;
    }
  }

  if (!hungriest || maxDeficit <= 0) return;

  const assignedIds = new Set(assignments.map((a) => a.shiftId));
  const unassigned = shifts.filter((s) => !assignedIds.has(s.id));

  if (unassigned.length > 0) {
    const target = unassigned[Math.floor(rng() * unassigned.length)];
    assignments.push({
      shiftId: target.id,
      agentId: hungriest.id,
      motivationScore: hungriest.motivation,
    });
    return;
  }

  let overSupplied: CoreAgent | null = null;
  let maxSurplus = 0;
  for (const agent of agents) {
    if (agent.id === hungriest.id) continue;
    const surplus =
      agent.currentHours +
      (agentHours.get(agent.id) || 0) -
      agent.guaranteedHours;
    if (surplus > maxSurplus) {
      maxSurplus = surplus;
      overSupplied = agent;
    }
  }

  if (overSupplied) {
    const targets = assignments
      .map((a, i) => ({ a, i }))
      .filter((x) => x.a.agentId === overSupplied!.id);
    if (targets.length > 0) {
      const target = targets[Math.floor(rng() * targets.length)];
      assignments[target.i] = {
        ...assignments[target.i],
        agentId: hungriest.id,
      };
    }
  }
}

export function mutate(
  scenario: CoreScenario,
  shifts: CoreShift[],
  agents: CoreAgent[],
  config: CoreConfig,
  rng: RngFn,
): CoreScenario {
  if (rng() > config.mutationRate) return scenario;

  const newAssignments = [...scenario.assignments];

  if (scenario.hardViolations > 0 && rng() < 0.5) {
    mutateFixViolation(newAssignments, shifts, agents, rng);
  } else {
    const roll = rng();
    if (
      roll < EVOLUTION_CONSTANTS.MUTATION_SWAP_THRESHOLD &&
      newAssignments.length > 0
    ) {
      mutateSwap(newAssignments, agents, rng);
    } else if (
      roll < EVOLUTION_CONSTANTS.MUTATION_REMOVE_THRESHOLD &&
      newAssignments.length > 0
    ) {
      mutateRemove(newAssignments, rng);
    } else if (roll < EVOLUTION_CONSTANTS.MUTATION_REPAIR_THRESHOLD) {
      mutateRepair(newAssignments, agents, rng);
    } else {
      mutateHungryFirst(newAssignments, shifts, agents, rng);
    }
  }

  return {
    ...scenario,
    id: generateId(rng),
    assignments: newAssignments,
    fitness: 0,
  };
}

export function mutateFixViolation(
  assignments: CoreAssignment[],
  shifts: CoreShift[],
  agents: CoreAgent[],
  rng: RngFn,
): void {
  const violations = evaluateHardConstraintViolations(
    assignments,
    shifts,
    agents,
  );
  if (violations.length === 0) return;

  const violatingAgentIds = new Set(violations.map((v) => v.agentId));
  const violatingIndices: number[] = [];
  for (let i = 0; i < assignments.length; i++) {
    if (violatingAgentIds.has(assignments[i].agentId)) violatingIndices.push(i);
  }
  if (violatingIndices.length === 0) return;

  const shiftMap = new Map(shifts.map((s) => [s.id, s]));
  const targetIdx =
    violatingIndices[Math.floor(rng() * violatingIndices.length)];
  const targetShift = shiftMap.get(assignments[targetIdx].shiftId);
  if (!targetShift) return;

  const dateKey = targetShift.date.split('T')[0];
  const agentDailyHrs = new Map<string, number>();
  for (const a of assignments) {
    const s = shiftMap.get(a.shiftId);
    if (s) {
      const key = `${a.agentId}_${s.date.split('T')[0]}`;
      agentDailyHrs.set(key, (agentDailyHrs.get(key) || 0) + s.hours);
    }
  }

  const candidates = agents.filter((a) => {
    if (a.id === assignments[targetIdx].agentId) return false;
    const key = `${a.id}_${dateKey}`;
    return (agentDailyHrs.get(key) || 0) + targetShift.hours <= a.maxDailyHours;
  });

  if (candidates.length > 0) {
    const newAgent = candidates[Math.floor(rng() * candidates.length)];
    assignments[targetIdx] = {
      ...assignments[targetIdx],
      agentId: newAgent.id,
      motivationScore: newAgent.motivation,
    };
  } else {
    assignments.splice(targetIdx, 1);
  }
}

export function crossoverBlock(
  p1: CoreScenario,
  p2: CoreScenario,
  shifts: CoreShift[],
  rng: RngFn,
): [CoreScenario, CoreScenario] {
  const shiftDateMap = new Map<string, string>();
  const uniqueDates = new Set<string>();
  for (const s of shifts) {
    const dk = s.date.split('T')[0];
    shiftDateMap.set(s.id, dk);
    uniqueDates.add(dk);
  }

  const dates = Array.from(uniqueDates);
  const swapDates = new Set<string>();
  for (const d of dates) {
    if (rng() < EVOLUTION_CONSTANTS.CROSSOVER_SWAP_PROBABILITY)
      swapDates.add(d);
  }
  if (swapDates.size === 0 && dates.length > 0) {
    swapDates.add(dates[Math.floor(rng() * dates.length)]);
  }

  const m1 = new Map<string, CoreAssignment>();
  for (const a of p1.assignments) m1.set(a.shiftId, a);
  const m2 = new Map<string, CoreAssignment>();
  for (const a of p2.assignments) m2.set(a.shiftId, a);

  const c1: CoreAssignment[] = [];
  const c2: CoreAssignment[] = [];
  const allIds = new Set([...m1.keys(), ...m2.keys()]);

  for (const sid of allIds) {
    const dk = shiftDateMap.get(sid) || '';
    if (swapDates.has(dk)) {
      const a2 = m2.get(sid);
      const a1 = m1.get(sid);
      if (a2) c1.push({ ...a2 });
      if (a1) c2.push({ ...a1 });
    } else {
      const a1 = m1.get(sid);
      const a2 = m2.get(sid);
      if (a1) c1.push({ ...a1 });
      if (a2) c2.push({ ...a2 });
    }
  }

  return [
    {
      id: generateId(rng),
      assignments: c1,
      fitness: 0,
      coverage: 0,
      penaltyScore: 0,
      hardViolations: 0,
    },
    {
      id: generateId(rng),
      assignments: c2,
      fitness: 0,
      coverage: 0,
      penaltyScore: 0,
      hardViolations: 0,
    },
  ];
}

export function tournamentSelect(
  population: CoreScenario[],
  rng: RngFn,
): CoreScenario {
  let best = population[Math.floor(rng() * population.length)];
  for (let i = 1; i < SCHEDULING_CONSTANTS.TOURNAMENT_SIZE; i++) {
    const candidate = population[Math.floor(rng() * population.length)];
    if (candidate.fitness > best.fitness) best = candidate;
  }
  return best;
}

export interface EvolutionCallbacks {
  onProgress: (data: CoreProgressData) => void;
  onResult: (data: CoreResultData) => void;
}

export function runEvolution(
  shifts: CoreShift[],
  agents: CoreAgent[],
  config: CoreConfig,
  penaltyWeights: CorePenaltyWeights,
  callbacks: EvolutionCallbacks,
): void {
  const rng: RngFn = config.randomSeed
    ? createSeededRng(config.randomSeed)
    : Math.random;

  const population: CoreScenario[] = [];
  const greedyCount = Math.floor(config.warmStartRatio * config.populationSize);
  const randomCount = config.populationSize - greedyCount;
  const strategies: GreedyStrategy[] = ['balanced', 'deficit', 'consistency'];

  for (let i = 0; i < greedyCount; i++) {
    const variation = i / Math.max(1, greedyCount - 1);
    const strategy = strategies[i % strategies.length];
    const scenario = createGreedyScenario(shifts, agents, variation, rng, strategy);
    calculateFitness(scenario, shifts, agents, penaltyWeights);
    population.push(scenario);
  }

  for (let i = 0; i < randomCount; i++) {
    const scenario = createRandomScenario(shifts, agents, rng);
    calculateFitness(scenario, shifts, agents, penaltyWeights);
    population.push(scenario);
  }

  const startTime = Date.now();
  let stagnationCount = 0;
  let previousBestFitness = 0;
  const bestFitnessHistory: number[] = [];

  for (let gen = 1; gen <= config.maxGenerations; gen++) {
    const timeElapsed = Date.now() - startTime;
    if (timeElapsed >= config.timeLimitMs) {
      sendResult(
        population,
        gen,
        'Time limit reached',
        'timeout',
        startTime,
        callbacks,
      );
      return;
    }

    population.sort((a, b) => b.fitness - a.fitness);
    const bestFitness = population[0]?.fitness || 0;
    bestFitnessHistory.push(bestFitness);

    if (bestFitness > previousBestFitness + config.convergenceThreshold) {
      stagnationCount = 0;
      previousBestFitness = bestFitness;
    } else {
      stagnationCount++;
    }

    const avgFitness =
      population.reduce((s, sc) => s + sc.fitness, 0) / population.length;

    if (gen % EVOLUTION_CONSTANTS.PROGRESS_REPORT_INTERVAL === 0 || gen === 1) {
      callbacks.onProgress({
        currentGeneration: gen,
        maxGenerations: config.maxGenerations,
        bestFitness,
        avgFitness,
        coverage: population[0]?.coverage || 0,
        timeElapsedMs: Date.now() - startTime,
        stagnationCount,
      });
    }

    if (bestFitness >= config.targetFitness) {
      sendResult(
        population,
        gen,
        'Target fitness reached',
        'target',
        startTime,
        callbacks,
      );
      return;
    }

    if (stagnationCount >= config.stagnationLimit) {
      sendResult(
        population,
        gen,
        `Stagnation after ${stagnationCount} generations`,
        'stagnation',
        startTime,
        callbacks,
      );
      return;
    }

    if (
      bestFitnessHistory.length >= EVOLUTION_CONSTANTS.CONVERGENCE_HISTORY_SIZE
    ) {
      const recent = bestFitnessHistory.slice(
        -EVOLUTION_CONSTANTS.CONVERGENCE_HISTORY_SIZE,
      );
      const improvement =
        recent[0] === 0
          ? 1
          : (recent[recent.length - 1] - recent[0]) / recent[0];
      if (improvement < config.convergenceThreshold) {
        sendResult(
          population,
          gen,
          'Converged',
          'converged',
          startTime,
          callbacks,
        );
        return;
      }
    }

    const newPop: CoreScenario[] = population.slice(0, config.eliteCount);

    while (newPop.length < config.populationSize) {
      const p1 = tournamentSelect(population, rng);
      const p2 = tournamentSelect(population, rng);

      let child1: CoreScenario, child2: CoreScenario;
      if (rng() <= config.crossoverRate) {
        [child1, child2] = crossoverBlock(p1, p2, shifts, rng);
      } else {
        child1 = { ...p1, id: generateId(rng), fitness: 0 };
        child2 = { ...p2, id: generateId(rng), fitness: 0 };
      }

      const m1 = mutate(child1, shifts, agents, config, rng);
      const m2 = mutate(child2, shifts, agents, config, rng);

      calculateFitness(m1, shifts, agents, penaltyWeights);
      calculateFitness(m2, shifts, agents, penaltyWeights);

      newPop.push(m1);
      if (newPop.length < config.populationSize) newPop.push(m2);
    }

    population.length = 0;
    population.push(...newPop);
  }

  sendResult(
    population,
    config.maxGenerations,
    'Max generations reached',
    'maxgen',
    startTime,
    callbacks,
  );
}

function sendResult(
  population: CoreScenario[],
  finalGeneration: number,
  message: string,
  stopReason: string,
  startTime: number,
  callbacks: EvolutionCallbacks,
): void {
  population.sort((a, b) => b.fitness - a.fitness);
  const best = population[0];

  callbacks.onResult({
    assignments: best?.assignments || [],
    fitness: best?.fitness || 0,
    coverage: best?.coverage || 0,
    penaltyScore: best?.penaltyScore || 0,
    hardViolations: best?.hardViolations || 0,
    finalGeneration,
    stopReason,
    message,
    timeElapsedMs: Date.now() - startTime,
  });
}
