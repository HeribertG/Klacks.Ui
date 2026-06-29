// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Mutation operators for the evolutionary engine (swap, remove, repair,
 * hungry-first, violation-fix) and the rate-gated mutate dispatcher.
 * @param scenario - Parent scenario to derive a mutated child from
 * @param assignments - Working copy of assignments mutated in place
 * @param shifts - Shifts in the problem
 * @param agents - Available agents
 * @param config - Evolution config providing the mutation rate/thresholds
 * @param rng - Random source (draw order must stay stable)
 */

import { EVOLUTION_CONSTANTS } from '../../../models/automation/automation-constants';
import { evaluateHardConstraintViolations } from './constraint-engine';
import {
  CoreShift,
  CoreAgent,
  CoreAssignment,
  CoreScenario,
  CoreConfig,
  RngFn,
} from './evolution-types';
import { generateId } from './evolution-rng';

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
