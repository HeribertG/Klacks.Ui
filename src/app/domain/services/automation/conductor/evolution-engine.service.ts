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

  initialize(
    shifts: IShift[],
    agents: IScheduleAgent[],
    config?: Partial<IEvolutionConfig>
  ): void {
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
    this.population = [];
    this.bestFitnessHistory = [];

    if (this.config.randomSeed) {
      this.mutationEngine.setRandomSeed(this.config.randomSeed);
    } else {
      this.mutationEngine.resetRandom();
    }

    const shiftIds = shifts.map(s => s.id);
    const agentIds = agents.map(a => a.id);

    for (let i = 0; i < this.config.populationSize; i++) {
      const scenario = this.mutationEngine.createRandomScenario(shiftIds, agentIds, 0);
      this.evaluateScenario(scenario, shifts, agents);
      this.population.push(scenario);
    }
  }

  runGeneration(
    generation: number,
    shifts: IShift[],
    agents: IScheduleAgent[]
  ): IEvolutionProgress {
    this.population.sort((a, b) => b.fitness - a.fitness);

    const bestFitness = this.population[0]?.fitness || 0;
    this.bestFitnessHistory.push(bestFitness);

    const avgFitness = this.population.reduce((sum, s) => sum + s.fitness, 0)
      / this.population.length;
    const coverage = this.population[0]?.coverage || 0;

    const improvement = this.calculateImprovement();
    const isConverged = improvement < this.config.convergenceThreshold;

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
      improvement
    };
  }

  async evolve(
    shifts: IShift[],
    agents: IScheduleAgent[],
    onProgress?: (progress: IEvolutionProgress) => void,
    cancellationToken?: { isCancelled: boolean }
  ): Promise<IEvolutionResult> {
    this.initialize(shifts, agents);

    for (let gen = 1; gen <= this.config.maxGenerations; gen++) {
      if (cancellationToken?.isCancelled) {
        return this.createResult(gen, 'Cancelled by user');
      }

      const progress = this.runGeneration(gen, shifts, agents);

      if (onProgress) {
        onProgress(progress);
      }

      if (progress.isConverged) {
        return this.createResult(gen, 'Converged');
      }

      // Yield to UI thread periodically
      if (gen % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return this.createResult(this.config.maxGenerations, 'Max generations reached');
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

      const [child1, child2] = this.mutationEngine.crossover(parent1, parent2, this.config);

      const mutated1 = this.mutationEngine.mutate(child1, agentIds, this.config);
      const mutated2 = this.mutationEngine.mutate(child2, agentIds, this.config);

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
  }

  private calculateImprovement(): number {
    if (this.bestFitnessHistory.length < 10) return 1;

    const recent = this.bestFitnessHistory.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];

    if (first === 0) return 1;
    return (last - first) / first;
  }

  private createResult(finalGeneration: number, message: string): IEvolutionResult {
    const best = this.getBestScenario();

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
        isConverged: this.calculateImprovement() < this.config.convergenceThreshold,
        improvement: this.calculateImprovement()
      },
      success: best !== null && best.coverage > 0.8,
      message
    };
  }
}
