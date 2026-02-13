import { Injectable } from '@angular/core';
import {
  ISchedulingScenario,
  IAssignment,
  IEvolutionConfig,
  IShift
} from '../../../models/automation/conductor/scheduling.models';
import { IScheduleAgent } from '../../../models/automation/agent/schedule-agent.model';
import { IConstraintViolation } from './fitness-evaluator.service';
import {
  CoreShift,
  CoreAgent,
  CoreScenario,
  RngFn,
  createSeededRng,
  generateId,
  crossoverBlock as coreCrossoverBlock,
  createGreedyScenario as coreCreateGreedyScenario
} from './evolution-core';

@Injectable({
  providedIn: 'root'
})
export class MutationEngineService {
  private rng: RngFn = Math.random;

  setRandomSeed(seed: number): void {
    this.rng = createSeededRng(seed);
  }

  resetRandom(): void {
    this.rng = Math.random;
  }

  mutate(
    scenario: ISchedulingScenario,
    agentIds: string[],
    config: IEvolutionConfig,
    shifts?: IShift[],
    agents?: IScheduleAgent[],
    hardViolations?: IConstraintViolation[]
  ): ISchedulingScenario {
    if (this.rng() > config.mutationRate) {
      return scenario;
    }

    const newAssignments: IAssignment[] = [...scenario.assignments];
    const roll = this.rng();

    if (roll < 0.25 && newAssignments.length > 0) {
      this.mutateSwap(newAssignments, agentIds);
    } else if (roll < 0.40 && newAssignments.length > 0) {
      this.mutateRemove(newAssignments);
    } else if (roll < 0.70 && shifts && agents && hardViolations) {
      this.mutateRepair(newAssignments, shifts, agents, hardViolations);
    } else if (shifts && agents) {
      this.mutateHungryFirst(newAssignments, shifts, agents);
    } else if (newAssignments.length > 0) {
      this.mutateSwap(newAssignments, agentIds);
    }

    return {
      ...scenario,
      id: generateId(this.rng),
      assignments: newAssignments
    };
  }

  crossover(
    parent1: ISchedulingScenario,
    parent2: ISchedulingScenario,
    config: IEvolutionConfig,
    shifts?: IShift[]
  ): [ISchedulingScenario, ISchedulingScenario] {
    if (this.rng() > config.crossoverRate) {
      return [parent1, parent2];
    }

    if (shifts && shifts.length > 0) {
      return this.crossoverBlock(parent1, parent2, shifts);
    }

    return this.crossoverSinglePoint(parent1, parent2);
  }

  crossoverBlock(
    parent1: ISchedulingScenario,
    parent2: ISchedulingScenario,
    shifts: IShift[]
  ): [ISchedulingScenario, ISchedulingScenario] {
    const coreShifts = shifts.map(s => this.toCoreShift(s));
    const coreP1 = this.toCoreScenario(parent1);
    const coreP2 = this.toCoreScenario(parent2);

    const [coreC1, coreC2] = coreCrossoverBlock(coreP1, coreP2, coreShifts, this.rng);

    return [
      this.fromCoreScenario(coreC1, parent1),
      this.fromCoreScenario(coreC2, parent2)
    ];
  }

  createRandomScenario(
    shiftIds: string[],
    agentIds: string[],
    generation: number
  ): ISchedulingScenario {
    const assignments: IAssignment[] = [];
    const chromosome = new Map<string, string | null>();

    for (const shiftId of shiftIds) {
      if (this.rng() < 0.7) {
        const randomAgent = agentIds[Math.floor(this.rng() * agentIds.length)];
        assignments.push({
          shiftId,
          agentId: randomAgent,
          motivationScore: this.rng(),
          timestamp: new Date()
        });
        chromosome.set(shiftId, randomAgent);
      } else {
        chromosome.set(shiftId, null);
      }
    }

    return {
      id: generateId(this.rng),
      generation,
      assignments,
      fitness: 0,
      coverage: 0,
      avgMotivation: 0,
      violationCount: 0,
      unassignedShifts: [],
      chromosome,
      penaltyScore: 0,
      hardViolations: 0
    };
  }

  createGreedyScenario(
    shifts: IShift[],
    agents: IScheduleAgent[],
    generation: number,
    variation = 0
  ): ISchedulingScenario {
    const coreShifts = shifts.map(s => this.toCoreShift(s));
    const coreAgents = agents.map(a => this.toCoreAgent(a));
    const coreScenario = coreCreateGreedyScenario(coreShifts, coreAgents, variation, this.rng);

    const chromosome = new Map<string, string | null>();
    const assignments: IAssignment[] = coreScenario.assignments.map(a => {
      chromosome.set(a.shiftId, a.agentId);
      return {
        shiftId: a.shiftId,
        agentId: a.agentId,
        motivationScore: a.motivationScore,
        timestamp: new Date()
      };
    });

    for (const shift of shifts) {
      if (!chromosome.has(shift.id)) {
        chromosome.set(shift.id, null);
      }
    }

    return {
      id: coreScenario.id,
      generation,
      assignments,
      fitness: 0,
      coverage: 0,
      avgMotivation: 0,
      violationCount: 0,
      unassignedShifts: [],
      chromosome,
      penaltyScore: 0,
      hardViolations: 0
    };
  }

  private mutateSwap(assignments: IAssignment[], agentIds: string[]): void {
    if (assignments.length === 0) return;

    const index = Math.floor(this.rng() * assignments.length);
    const newAgent = agentIds[Math.floor(this.rng() * agentIds.length)];

    assignments[index] = {
      ...assignments[index],
      agentId: newAgent,
      timestamp: new Date()
    };
  }

  private mutateRemove(assignments: IAssignment[]): void {
    if (assignments.length === 0) return;

    const index = Math.floor(this.rng() * assignments.length);
    assignments.splice(index, 1);
  }

  private mutateRepair(
    assignments: IAssignment[],
    shifts: IShift[],
    agents: IScheduleAgent[],
    hardViolations: IConstraintViolation[]
  ): void {
    if (hardViolations.length === 0) return;

    const violation = hardViolations[Math.floor(this.rng() * hardViolations.length)];
    const overloadedAgentId = violation.agentId;

    const agentAssignmentCount = new Map<string, number>();
    for (const a of assignments) {
      agentAssignmentCount.set(a.agentId, (agentAssignmentCount.get(a.agentId) || 0) + 1);
    }

    const underloadedAgents = agents
      .filter(a => {
        const count = agentAssignmentCount.get(a.id) || 0;
        return a.id !== overloadedAgentId && count < (agentAssignmentCount.get(overloadedAgentId) || 0);
      })
      .sort((a, b) => (agentAssignmentCount.get(a.id) || 0) - (agentAssignmentCount.get(b.id) || 0));

    if (underloadedAgents.length === 0) return;

    const overloadedAssignments = assignments
      .map((a, i) => ({ assignment: a, index: i }))
      .filter(item => item.assignment.agentId === overloadedAgentId);

    if (overloadedAssignments.length === 0) return;

    const target = overloadedAssignments[Math.floor(this.rng() * overloadedAssignments.length)];
    const replacement = underloadedAgents[0];

    assignments[target.index] = {
      ...assignments[target.index],
      agentId: replacement.id,
      timestamp: new Date()
    };
  }

  private mutateHungryFirst(
    assignments: IAssignment[],
    shifts: IShift[],
    agents: IScheduleAgent[]
  ): void {
    const shiftMap = new Map(shifts.map(s => [s.id, s]));
    const agentScheduledHours = new Map<string, number>();

    for (const a of assignments) {
      const shift = shiftMap.get(a.shiftId);
      if (shift) {
        agentScheduledHours.set(a.agentId, (agentScheduledHours.get(a.agentId) || 0) + shift.hours);
      }
    }

    let hungriestAgent: IScheduleAgent | null = null;
    let maxDeficit = -Infinity;

    for (const agent of agents) {
      const scheduled = agentScheduledHours.get(agent.id) || 0;
      const deficit = agent.guaranteedHours - (agent.currentHours + scheduled);
      if (deficit > maxDeficit) {
        maxDeficit = deficit;
        hungriestAgent = agent;
      }
    }

    if (!hungriestAgent || maxDeficit <= 0) return;

    const assignedShiftIds = new Set(assignments.map(a => a.shiftId));
    const unassignedShifts = shifts.filter(s => !assignedShiftIds.has(s.id));

    if (unassignedShifts.length > 0) {
      const targetShift = unassignedShifts[Math.floor(this.rng() * unassignedShifts.length)];
      assignments.push({
        shiftId: targetShift.id,
        agentId: hungriestAgent.id,
        motivationScore: hungriestAgent.currentState.motivation,
        timestamp: new Date()
      });
      return;
    }

    let overSuppliedAgent: IScheduleAgent | null = null;
    let maxSurplus = 0;

    for (const agent of agents) {
      if (agent.id === hungriestAgent.id) continue;
      const scheduled = agentScheduledHours.get(agent.id) || 0;
      const surplus = (agent.currentHours + scheduled) - agent.guaranteedHours;
      if (surplus > maxSurplus) {
        maxSurplus = surplus;
        overSuppliedAgent = agent;
      }
    }

    if (overSuppliedAgent) {
      const overSuppliedAssignments = assignments
        .map((a, i) => ({ assignment: a, index: i }))
        .filter(item => item.assignment.agentId === overSuppliedAgent!.id);

      if (overSuppliedAssignments.length > 0) {
        const target = overSuppliedAssignments[Math.floor(this.rng() * overSuppliedAssignments.length)];
        assignments[target.index] = {
          ...assignments[target.index],
          agentId: hungriestAgent.id,
          timestamp: new Date()
        };
      }
    }
  }

  private crossoverSinglePoint(
    parent1: ISchedulingScenario,
    parent2: ISchedulingScenario
  ): [ISchedulingScenario, ISchedulingScenario] {
    const map1 = this.assignmentMap(parent1.assignments);
    const map2 = this.assignmentMap(parent2.assignments);

    const allShiftIds = new Set([...map1.keys(), ...map2.keys()]);
    const shiftIds = Array.from(allShiftIds);
    const crossoverPoint = Math.floor(this.rng() * shiftIds.length);

    const child1Assignments: IAssignment[] = [];
    const child2Assignments: IAssignment[] = [];

    for (let i = 0; i < shiftIds.length; i++) {
      const shiftId = shiftIds[i];

      if (i < crossoverPoint) {
        const a1 = map1.get(shiftId);
        const a2 = map2.get(shiftId);
        if (a1) child1Assignments.push(a1);
        if (a2) child2Assignments.push(a2);
      } else {
        const a1 = map1.get(shiftId);
        const a2 = map2.get(shiftId);
        if (a2) child1Assignments.push(a2);
        if (a1) child2Assignments.push(a1);
      }
    }

    return [
      {
        ...parent1,
        id: generateId(this.rng),
        assignments: child1Assignments,
        fitness: 0,
        penaltyScore: 0,
        hardViolations: 0
      },
      {
        ...parent2,
        id: generateId(this.rng),
        assignments: child2Assignments,
        fitness: 0,
        penaltyScore: 0,
        hardViolations: 0
      }
    ];
  }

  private assignmentMap(assignments: IAssignment[]): Map<string, IAssignment> {
    const map = new Map<string, IAssignment>();
    for (const a of assignments) {
      map.set(a.shiftId, a);
    }
    return map;
  }

  private toCoreShift(shift: IShift): CoreShift {
    return {
      id: shift.id,
      name: shift.name,
      date: shift.date instanceof Date ? shift.date.toISOString() : String(shift.date),
      startTime: shift.startTime,
      endTime: shift.endTime,
      hours: shift.hours,
      requiredAssignments: shift.requiredAssignments,
      priority: shift.priority
    };
  }

  private toCoreAgent(agent: IScheduleAgent): CoreAgent {
    return {
      id: agent.id,
      currentHours: agent.currentHours,
      guaranteedHours: agent.guaranteedHours,
      maxConsecutiveDays: agent.maxConsecutiveDays,
      minRestHours: agent.minRestHours,
      motivation: agent.currentState.motivation
    };
  }

  private toCoreScenario(scenario: ISchedulingScenario): CoreScenario {
    return {
      id: scenario.id,
      assignments: scenario.assignments.map(a => ({
        shiftId: a.shiftId,
        agentId: a.agentId,
        motivationScore: a.motivationScore
      })),
      fitness: scenario.fitness,
      coverage: scenario.coverage,
      penaltyScore: scenario.penaltyScore,
      hardViolations: scenario.hardViolations
    };
  }

  private fromCoreScenario(
    core: CoreScenario,
    templateScenario: ISchedulingScenario
  ): ISchedulingScenario {
    return {
      ...templateScenario,
      id: core.id,
      assignments: core.assignments.map(a => ({
        shiftId: a.shiftId,
        agentId: a.agentId,
        motivationScore: a.motivationScore,
        timestamp: new Date()
      })),
      fitness: core.fitness,
      penaltyScore: core.penaltyScore,
      hardViolations: core.hardViolations
    };
  }
}
