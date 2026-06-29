// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Deterministic seeded random number generator and scenario id factory for the
 * evolutionary engine.
 * @param seed - Initial state for the linear congruential generator
 * @param rng - Random source used to derive the random suffix of a scenario id
 */

import { EVOLUTION_CONSTANTS } from '../../../models/automation/automation-constants';
import { RngFn } from './evolution-types';

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
