// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Main generational loop of the evolutionary scheduling engine. Builds the
 * warm-start + random initial population, then iterates selection, crossover,
 * mutation and fitness evaluation until a stop condition is met. Re-exports the
 * engine's building blocks (types, rng, fitness, scenario builders, mutation,
 * genetics) so consumers keep a single import surface.
 * @param shifts - Shifts to schedule
 * @param agents - Available agents
 * @param config - Evolution parameters (population, generations, rates, limits)
 * @param penaltyWeights - Penalty/bonus weights for fitness
 * @param callbacks - Progress and result reporting hooks
 */

import { EVOLUTION_CONSTANTS } from '../../../models/automation/automation-constants';
import {
  CoreShift,
  CoreAgent,
  CoreConfig,
  CorePenaltyWeights,
  CoreScenario,
  RngFn,
  EvolutionCallbacks,
} from './evolution-types';
import { createSeededRng, generateId } from './evolution-rng';
import { calculateFitness } from './evolution-fitness';
import {
  createGreedyScenario,
  createRandomScenario,
  GreedyStrategy,
} from './evolution-scenario-builder';
import { mutate } from './evolution-mutation';
import { crossoverBlock, tournamentSelect } from './evolution-genetics';

export * from './evolution-types';
export * from './evolution-rng';
export * from './evolution-fitness';
export * from './evolution-scenario-builder';
export * from './evolution-mutation';
export * from './evolution-genetics';

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
