import { Injectable, inject } from '@angular/core';
import {
  IShift,
  IConductorContext,
  IEvolutionConfig,
  IEvolutionResult,
  IEvolutionProgress,
  DEFAULT_EVOLUTION_CONFIG,
  DEFAULT_PENALTY_WEIGHTS,
  IPenaltyWeights
} from '../../../models/automation/conductor/scheduling.models';
import { IScheduleAgent, IAgentDecision } from '../../../models/automation/agent/schedule-agent.model';
import { EvolutionEngineService } from './evolution-engine.service';
import { AgentStateService } from '../agent/agent-state.service';
import { RulesEngineService } from '../rules/rules-engine.service';

export interface IConductorOptions {
  evolutionConfig?: Partial<IEvolutionConfig>;
  penaltyWeights?: Partial<IPenaltyWeights>;
  onProgress?: (progress: IEvolutionProgress) => void;
  cancellationToken?: { isCancelled: boolean };
  useWorker?: boolean;
}

export interface IAssignmentResult {
  shiftId: string;
  shiftName: string;
  date: Date;
  agentId: string;
  agentName: string;
  motivation: number;
  hours: number;
}

export interface IConductorResult {
  success: boolean;
  assignments: IAssignmentResult[];
  unassignedShifts: string[];
  coverage: number;
  avgMotivation: number;
  generations: number;
  message: string;
  stopReason?: string;
  timeElapsedMs?: number;
  penaltyScore?: number;
  hardViolations?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConductorService {
  private evolutionEngine = inject(EvolutionEngineService);
  private agentStateService = inject(AgentStateService);
  private rulesEngine = inject(RulesEngineService);

  private isInitialized = false;
  private activeWorker: Worker | null = null;

  initialize(): void {
    if (this.isInitialized) return;

    this.rulesEngine.initialize();
    this.isInitialized = true;
  }

  async schedule(
    context: IConductorContext,
    options: IConductorOptions = {}
  ): Promise<IConductorResult> {
    this.ensureInitialized();

    const { shifts, agents } = context;

    if (shifts.length === 0) {
      return {
        success: false,
        assignments: [],
        unassignedShifts: [],
        coverage: 0,
        avgMotivation: 0,
        generations: 0,
        message: 'No shifts to schedule'
      };
    }

    if (agents.length === 0) {
      return {
        success: false,
        assignments: [],
        unassignedShifts: shifts.map(s => s.id),
        coverage: 0,
        avgMotivation: 0,
        generations: 0,
        message: 'No agents available'
      };
    }

    if (options.useWorker && typeof Worker !== 'undefined') {
      return this.scheduleWithWorker(context, options);
    }

    const evolutionResult = await this.evolutionEngine.evolve(
      shifts,
      agents,
      options.onProgress,
      options.cancellationToken
    );

    return this.convertToResult(evolutionResult, shifts, agents);
  }

  scheduleWithWorker(
    context: IConductorContext,
    options: IConductorOptions = {}
  ): Promise<IConductorResult> {
    return new Promise((resolve, reject) => {
      try {
        this.terminateActiveWorker();

        const worker = new Worker(new URL('./evolution.worker', import.meta.url));
        this.activeWorker = worker;

        const { shifts, agents } = context;
        const config = { ...DEFAULT_EVOLUTION_CONFIG, ...options.evolutionConfig };
        const penaltyWeights = { ...DEFAULT_PENALTY_WEIGHTS, ...options.penaltyWeights };

        const workerShifts = shifts.map(s => ({
          id: s.id,
          name: s.name,
          date: s.date instanceof Date ? s.date.toISOString() : String(s.date),
          startTime: s.startTime,
          endTime: s.endTime,
          hours: s.hours,
          requiredAssignments: s.requiredAssignments,
          priority: s.priority
        }));

        const workerAgents = agents.map(a => ({
          id: a.id,
          currentHours: a.currentHours,
          guaranteedHours: a.guaranteedHours,
          maxConsecutiveDays: a.maxConsecutiveDays,
          minRestHours: a.minRestHours,
          motivation: a.currentState.motivation
        }));

        worker.onmessage = ({ data }) => {
          if (data.type === 'progress' && options.onProgress) {
            options.onProgress({
              currentGeneration: data.data.currentGeneration,
              maxGenerations: data.data.maxGenerations,
              bestFitness: data.data.bestFitness,
              avgFitness: data.data.avgFitness,
              coverage: data.data.coverage,
              isConverged: false,
              improvement: 0,
              timeElapsedMs: data.data.timeElapsedMs,
              stagnationCount: data.data.stagnationCount
            });
          }

          if (data.type === 'result') {
            this.terminateActiveWorker();

            const resultData = data.data;
            const assignments: IAssignmentResult[] = resultData.assignments.map((a: { shiftId: string; agentId: string; motivationScore: number }) => {
              const shift = shifts.find(s => s.id === a.shiftId);
              const agent = agents.find(ag => ag.id === a.agentId);
              return {
                shiftId: a.shiftId,
                shiftName: shift?.name || 'Unknown',
                date: shift?.date || new Date(),
                agentId: a.agentId,
                agentName: agent
                  ? `${agent.client.firstName} ${agent.client.name}`
                  : 'Unknown',
                motivation: a.motivationScore,
                hours: shift?.hours || 0
              };
            });

            const assignedShiftIds = new Set(resultData.assignments.map((a: { shiftId: string }) => a.shiftId));
            const unassignedShifts = shifts.filter(s => !assignedShiftIds.has(s.id)).map(s => s.id);

            resolve({
              success: resultData.coverage > 0.8,
              assignments,
              unassignedShifts,
              coverage: resultData.coverage,
              avgMotivation: resultData.assignments.length > 0
                ? resultData.assignments.reduce((sum: number, a: { motivationScore: number }) => sum + a.motivationScore, 0) / resultData.assignments.length
                : 0,
              generations: resultData.finalGeneration,
              message: resultData.message,
              stopReason: resultData.stopReason,
              timeElapsedMs: resultData.timeElapsedMs,
              penaltyScore: resultData.penaltyScore,
              hardViolations: resultData.hardViolations
            });
          }
        };

        worker.onerror = (error) => {
          this.terminateActiveWorker();
          reject(new Error(`Worker error: ${error.message}`));
        };

        if (options.cancellationToken) {
          const checkCancellation = setInterval(() => {
            if (options.cancellationToken?.isCancelled) {
              clearInterval(checkCancellation);
              this.terminateActiveWorker();
              resolve({
                success: false,
                assignments: [],
                unassignedShifts: shifts.map(s => s.id),
                coverage: 0,
                avgMotivation: 0,
                generations: 0,
                message: 'Cancelled by user',
                stopReason: 'cancelled'
              });
            }
          }, 100);

          worker.addEventListener('message', ({ data: msg }) => {
            if (msg.type === 'result') clearInterval(checkCancellation);
          }, { once: false });
        }

        worker.postMessage({
          shifts: workerShifts,
          agents: workerAgents,
          config,
          penaltyWeights
        });
      } catch (error) {
        this.terminateActiveWorker();
        reject(error);
      }
    });
  }

  cancelWorker(): void {
    this.terminateActiveWorker();
  }

  scheduleGreedy(context: IConductorContext): IConductorResult {
    this.ensureInitialized();

    const { shifts, agents } = context;
    const assignments: IAssignmentResult[] = [];
    const assignedShiftIds = new Set<string>();

    const sortedShifts = [...shifts].sort((a, b) => b.priority - a.priority);

    for (const shift of sortedShifts) {
      const bestAgent = this.findBestAgent(shift, agents, assignments);

      if (bestAgent) {
        const state = this.agentStateService.calculateStateWithRules(
          bestAgent,
          shift.id,
          shift.name,
          shift.date,
          shift.startTime,
          shift.endTime,
          shift.hours
        );

        assignments.push({
          shiftId: shift.id,
          shiftName: shift.name,
          date: shift.date,
          agentId: bestAgent.id,
          agentName: `${bestAgent.client.firstName} ${bestAgent.client.name}`,
          motivation: state.motivation,
          hours: shift.hours
        });

        assignedShiftIds.add(shift.id);
        bestAgent.currentHours += shift.hours;
      }
    }

    const unassigned = shifts
      .filter(s => !assignedShiftIds.has(s.id))
      .map(s => s.id);

    const avgMotivation = assignments.length > 0
      ? assignments.reduce((sum, a) => sum + a.motivation, 0) / assignments.length
      : 0;

    return {
      success: unassigned.length === 0,
      assignments,
      unassignedShifts: unassigned,
      coverage: assignedShiftIds.size / shifts.length,
      avgMotivation,
      generations: 1,
      message: unassigned.length === 0
        ? 'All shifts assigned'
        : `${unassigned.length} shifts could not be assigned`
    };
  }

  getAgentDecisions(
    shift: IShift,
    agents: IScheduleAgent[]
  ): IAgentDecision[] {
    this.ensureInitialized();

    const decisions: IAgentDecision[] = [];

    for (const agent of agents) {
      const state = this.agentStateService.calculateStateWithRules(
        agent,
        shift.id,
        shift.name,
        shift.date,
        shift.startTime,
        shift.endTime,
        shift.hours
      );

      decisions.push({
        agent,
        shiftId: shift.id,
        shiftName: shift.name,
        motivationScore: state.motivation,
        ruleViolations: [],
        acceptanceProbability: state.motivation
      });
    }

    return decisions.sort((a, b) => b.motivationScore - a.motivationScore);
  }

  async preview(
    context: IConductorContext,
    options: IConductorOptions = {}
  ): Promise<IConductorResult> {
    return this.schedule(context, options);
  }

  async applySchedule(result: IConductorResult): Promise<boolean> {
    console.log('Applying schedule:', result);
    return true;
  }

  private findBestAgent(
    shift: IShift,
    agents: IScheduleAgent[],
    existingAssignments: IAssignmentResult[]
  ): IScheduleAgent | null {
    let bestAgent: IScheduleAgent | null = null;
    let bestMotivation = -1;

    for (const agent of agents) {
      const hasAssignment = existingAssignments.some(
        a => a.agentId === agent.id && a.shiftId === shift.id
      );
      if (hasAssignment) continue;

      const state = this.agentStateService.calculateStateWithRules(
        agent,
        shift.id,
        shift.name,
        shift.date,
        shift.startTime,
        shift.endTime,
        shift.hours
      );

      if (state.motivation > bestMotivation) {
        bestMotivation = state.motivation;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  private convertToResult(
    evolutionResult: IEvolutionResult,
    shifts: IShift[],
    agents: IScheduleAgent[]
  ): IConductorResult {
    const best = evolutionResult.bestScenario;

    const assignments: IAssignmentResult[] = best.assignments.map(a => {
      const shift = shifts.find(s => s.id === a.shiftId);
      const agent = agents.find(ag => ag.id === a.agentId);

      return {
        shiftId: a.shiftId,
        shiftName: shift?.name || 'Unknown',
        date: shift?.date || new Date(),
        agentId: a.agentId,
        agentName: agent
          ? `${agent.client.firstName} ${agent.client.name}`
          : 'Unknown',
        motivation: a.motivationScore,
        hours: shift?.hours || 0
      };
    });

    return {
      success: evolutionResult.success,
      assignments,
      unassignedShifts: best.unassignedShifts,
      coverage: best.coverage,
      avgMotivation: best.avgMotivation,
      generations: evolutionResult.finalGeneration,
      message: evolutionResult.message,
      stopReason: evolutionResult.progress.stopReason,
      timeElapsedMs: evolutionResult.progress.timeElapsedMs,
      penaltyScore: best.penaltyScore,
      hardViolations: best.hardViolations
    };
  }

  private terminateActiveWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      this.initialize();
    }
  }
}
