// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Genetic recombination/selection for the evolutionary engine: date-block
 * crossover producing two children and fitness-based tournament selection.
 * @param p1 - First parent scenario
 * @param p2 - Second parent scenario
 * @param shifts - Shifts used to group assignments by date
 * @param population - Current population to select a parent from
 * @param rng - Random source (draw order must stay stable)
 */

import {
  SCHEDULING_CONSTANTS,
  EVOLUTION_CONSTANTS,
} from '../../../models/automation/automation-constants';
import {
  CoreShift,
  CoreAssignment,
  CoreScenario,
  RngFn,
} from './evolution-types';
import { generateId } from './evolution-rng';

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
