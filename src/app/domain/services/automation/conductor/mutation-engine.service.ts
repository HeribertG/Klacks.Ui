import { Injectable } from '@angular/core';
import {
  ISchedulingScenario,
  IAssignment,
  IEvolutionConfig
} from '../../../models/automation/conductor/scheduling.models';

@Injectable({
  providedIn: 'root'
})
export class MutationEngineService {
  private rng: () => number = Math.random;

  setRandomSeed(seed: number): void {
    let state = seed;
    this.rng = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  resetRandom(): void {
    this.rng = Math.random;
  }

  mutate(
    scenario: ISchedulingScenario,
    agentIds: string[],
    config: IEvolutionConfig
  ): ISchedulingScenario {
    if (this.rng() > config.mutationRate) {
      return scenario;
    }

    const newAssignments: IAssignment[] = [...scenario.assignments];
    const mutationType = this.rng();

    if (mutationType < 0.33 && newAssignments.length > 0) {
      this.mutateSwap(newAssignments, agentIds);
    } else if (mutationType < 0.66 && newAssignments.length > 0) {
      this.mutateRemove(newAssignments);
    }

    return {
      ...scenario,
      id: this.generateId(),
      assignments: newAssignments
    };
  }

  crossover(
    parent1: ISchedulingScenario,
    parent2: ISchedulingScenario,
    config: IEvolutionConfig
  ): [ISchedulingScenario, ISchedulingScenario] {
    if (this.rng() > config.crossoverRate) {
      return [parent1, parent2];
    }

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

    const child1: ISchedulingScenario = {
      ...parent1,
      id: this.generateId(),
      assignments: child1Assignments,
      fitness: 0
    };

    const child2: ISchedulingScenario = {
      ...parent2,
      id: this.generateId(),
      assignments: child2Assignments,
      fitness: 0
    };

    return [child1, child2];
  }

  createRandomScenario(
    shiftIds: string[],
    agentIds: string[],
    generation: number
  ): ISchedulingScenario {
    const assignments: IAssignment[] = [];

    for (const shiftId of shiftIds) {
      if (this.rng() < 0.7) {
        const randomAgent = agentIds[Math.floor(this.rng() * agentIds.length)];
        assignments.push({
          shiftId,
          agentId: randomAgent,
          motivationScore: this.rng(),
          timestamp: new Date()
        });
      }
    }

    return {
      id: this.generateId(),
      generation,
      assignments,
      fitness: 0,
      coverage: 0,
      avgMotivation: 0,
      violationCount: 0,
      unassignedShifts: []
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

  private assignmentMap(assignments: IAssignment[]): Map<string, IAssignment> {
    const map = new Map<string, IAssignment>();
    for (const a of assignments) {
      map.set(a.shiftId, a);
    }
    return map;
  }

  private generateId(): string {
    return 'scenario_' + Date.now() + '_' + Math.floor(this.rng() * 10000);
  }
}
