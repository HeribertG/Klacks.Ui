import { Injectable, inject } from '@angular/core';
import {
  ISchedulingScenario,
  IEvolutionConfig,
  IEvolutionResult,
  IEvolutionProgress,
  IGenerationStats,
  IShift,
  DEFAULT_EVOLUTION_CONFIG
} from '../../../models/automation/conductor/scheduling.models';
import { IScheduleAgent } from '../../../models/automation/agent/schedule-agent.model';
import { FitnessEvaluatorService } from './fitness-evaluator.service';
import { MutationEngineService } from './mutation-engine.service';

@Injectable({
  providedIn: 'root'
})
export class EvolutionEngineService {
  private fitnessEvaluator = inject(FitnessEvaluatorService);
  private mutationEngine = inject(MutationEngineService);

  private population: ISchedulingScenario[] = [];
  private config: IEvolutionConfig = DEFAULT_EVOLUTION_CONFIG;
  private bestFitnessHistory: number[] = [];
  private stagnationCount = 0;
  private previousBestFitness = 0;

  initialize(
    shifts: IShift[],
    agents: IScheduleAgent[],
    config?: Partial<IEvolutionConfig>
  ): void {
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
    this.population = [];
    this.bestFitnessHistory = [];
    this.stagnationCount = 0;
    this.previousBestFitness = 0;

    if (this.config.randomSeed) {
      this.mutationEngine.setRandomSeed(this.config.randomSeed);
    } else {
      this.mutationEngine.resetRandom();
    }

    const shiftIds = shifts.map(s => s.id);
    const agentIds = agents.map(a => a.id);

    const greedyCount = Math.floor(this.config.warmStartRatio * this.config.populationSize);
    const randomCount = this.config.populationSize - greedyCount;

    for (let i = 0; i < greedyCount; i++) {
      const variation = i / Math.max(1, greedyCount - 1);
      const scenario = this.mutationEngine.createGreedyScenario(shifts, agents, 0, variation);
      this.evaluateScenario(scenario, shifts, agents);
      this.population.push(scenario);
    }

    for (let i = 0; i < randomCount; i++) {
      const scenario = this.mutationEngine.createRandomScenario(shiftIds, agentIds, 0);
      this.evaluateScenario(scenario, shifts, agents);
      this.population.push(scenario);
    }
  }

  runGeneration(
    generation: number,
    shifts: IShift[],
    agents: IScheduleAgent[],
    startTime: number
  ): IEvolutionProgress {
    this.population.sort((a, b) => b.fitness - a.fitness);

    const bestFitness = this.population[0]?.fitness || 0;
    this.bestFitnessHistory.push(bestFitness);

    if (bestFitness > this.previousBestFitness + this.config.convergenceThreshold) {
      this.stagnationCount = 0;
      this.previousBestFitness = bestFitness;
    } else {
      this.stagnationCount++;
    }

    const avgFitness = this.population.reduce((sum, s) => sum + s.fitness, 0)
      / this.population.length;
    const coverage = this.population[0]?.coverage || 0;
    const improvement = this.calculateImprovement();
    const timeElapsedMs = Date.now() - startTime;

    const isConverged = improvement < this.config.convergenceThreshold
      && this.bestFitnessHistory.length >= 10;

    if (!isConverged && generation < this.config.maxGenerations) {
      this.createNextGeneration(generation + 1, shifts, agents);
    }

    return {
      currentGeneration: generation,
      maxGenerations: this.config.maxGenerations,
      bestFitness,
      avgFitness,
      coverage,
      isConverged,
      improvement,
      timeElapsedMs,
      stagnationCount: this.stagnationCount
    };
  }

  async evolve(
    shifts: IShift[],
    agents: IScheduleAgent[],
    onProgress?: (progress: IEvolutionProgress) => void,
    cancellationToken?: { isCancelled: boolean }
  ): Promise<IEvolutionResult> {
    this.initialize(shifts, agents);

    const startTime = Date.now();

    for (let gen = 1; gen <= this.config.maxGenerations; gen++) {
      if (cancellationToken?.isCancelled) {
        return this.createResult(gen, 'Cancelled by user', startTime, 'cancelled');
      }

      const timeElapsed = Date.now() - startTime;
      if (timeElapsed >= this.config.timeLimitMs) {
        return this.createResult(gen, 'Time limit reached', startTime, 'timeout');
      }

      const progress = this.runGeneration(gen, shifts, agents, startTime);

      if (onProgress) {
        onProgress(progress);
      }

      if (progress.bestFitness >= this.config.targetFitness) {
        return this.createResult(gen, 'Target fitness reached', startTime, 'target');
      }

      if (this.stagnationCount >= this.config.stagnationLimit) {
        return this.createResult(gen, `Stagnation after ${this.stagnationCount} generations`, startTime, 'stagnation');
      }

      if (progress.isConverged) {
        return this.createResult(gen, 'Converged', startTime, 'converged');
      }

      if (gen % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return this.createResult(this.config.maxGenerations, 'Max generations reached', startTime, 'maxgen');
  }

  getPopulation(): ISchedulingScenario[] {
    return [...this.population];
  }

  getBestScenario(): ISchedulingScenario | null {
    if (this.population.length === 0) return null;
    return this.population.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );
  }

  getGenerationStats(generation: number): IGenerationStats {
    const fitnesses = this.population.map(s => s.fitness);
    const best = Math.max(...fitnesses);
    const worst = Math.min(...fitnesses);
    const avg = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;

    const variance = fitnesses.reduce((sum, f) => sum + Math.pow(f - avg, 2), 0)
      / fitnesses.length;
    const diversity = 1 - (Math.sqrt(variance) / (best - worst + 0.001));

    return {
      generation,
      bestFitness: best,
      worstFitness: worst,
      avgFitness: avg,
      diversity: Math.max(0, diversity)
    };
  }

  private createNextGeneration(
    generation: number,
    shifts: IShift[],
    agents: IScheduleAgent[]
  ): void {
    const newPopulation: ISchedulingScenario[] = [];
    const agentIds = agents.map(a => a.id);

    const elite = this.population.slice(0, this.config.eliteCount);
    newPopulation.push(...elite);

    while (newPopulation.length < this.config.populationSize) {
      const parent1 = this.tournamentSelect();
      const parent2 = this.tournamentSelect();

      const [child1, child2] = this.mutationEngine.crossover(parent1, parent2, this.config, shifts);

      const hardViolations1 = this.fitnessEvaluator.evaluateHardConstraints(child1, shifts, agents);
      const hardViolations2 = this.fitnessEvaluator.evaluateHardConstraints(child2, shifts, agents);

      const mutated1 = this.mutationEngine.mutate(child1, agentIds, this.config, shifts, agents, hardViolations1);
      const mutated2 = this.mutationEngine.mutate(child2, agentIds, this.config, shifts, agents, hardViolations2);

      this.evaluateScenario(mutated1, shifts, agents);
      this.evaluateScenario(mutated2, shifts, agents);

      newPopulation.push(mutated1);
      if (newPopulation.length < this.config.populationSize) {
        newPopulation.push(mutated2);
      }
    }

    this.population = newPopulation;
  }

  private tournamentSelect(): ISchedulingScenario {
    const tournamentSize = 3;
    let best = this.population[Math.floor(Math.random() * this.population.length)];

    for (let i = 1; i < tournamentSize; i++) {
      const candidate = this.population[Math.floor(Math.random() * this.population.length)];
      if (candidate.fitness > best.fitness) {
        best = candidate;
      }
    }

    return best;
  }

  private evaluateScenario(
    scenario: ISchedulingScenario,
    shifts: IShift[],
    agents: IScheduleAgent[]
  ): void {
    scenario.fitness = this.fitnessEvaluator.calculateFitness(scenario, shifts, agents);
    scenario.avgMotivation = this.fitnessEvaluator.calculateAverageMotivation(scenario);
    scenario.coverage = this.fitnessEvaluator.calculateCoverage(scenario, shifts);

    const assignedShiftIds = new Set(scenario.assignments.map(a => a.shiftId));
    scenario.unassignedShifts = shifts.filter(s => !assignedShiftIds.has(s.id)).map(s => s.id);
    scenario.violationCount = scenario.hardViolations;

    scenario.chromosome = new Map<string, string | null>();
    for (const shift of shifts) {
      const assignment = scenario.assignments.find(a => a.shiftId === shift.id);
      scenario.chromosome.set(shift.id, assignment?.agentId || null);
    }
  }

  private calculateImprovement(): number {
    if (this.bestFitnessHistory.length < 10) return 1;

    const recent = this.bestFitnessHistory.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];

    if (first === 0) return 1;
    return (last - first) / first;
  }

  private createResult(
    finalGeneration: number,
    message: string,
    startTime: number,
    stopReason: 'converged' | 'stagnation' | 'target' | 'timeout' | 'maxgen' | 'cancelled'
  ): IEvolutionResult {
    const best = this.getBestScenario();
    const timeElapsedMs = Date.now() - startTime;

    return {
      bestScenario: best || this.population[0],
      finalGeneration,
      totalGenerations: this.config.maxGenerations,
      progress: {
        currentGeneration: finalGeneration,
        maxGenerations: this.config.maxGenerations,
        bestFitness: best?.fitness || 0,
        avgFitness: this.population.reduce((sum, s) => sum + s.fitness, 0)
          / this.population.length,
        coverage: best?.coverage || 0,
        isConverged: stopReason === 'converged',
        improvement: this.calculateImprovement(),
        timeElapsedMs,
        stagnationCount: this.stagnationCount,
        stopReason
      },
      success: best !== null && best.coverage > 0.8,
      message
    };
  }
}
