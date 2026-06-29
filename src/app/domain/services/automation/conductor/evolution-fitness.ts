// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Fitness scoring for the evolutionary engine: hard/soft constraint counters,
 * composite fitness, fairness (coefficient of variation) and coverage ratio.
 * @param scenario - Candidate schedule whose fitness/coverage fields are mutated
 * @param shifts - Shifts to be covered
 * @param agents - Available agents
 * @param weights - Penalty/bonus weights driving the composite score
 */

import {
  evaluateHardConstraintViolations,
  evaluateSoftConstraintViolations,
} from './constraint-engine';
import {
  CoreShift,
  CoreAgent,
  CoreScenario,
  CorePenaltyWeights,
} from './evolution-types';

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
