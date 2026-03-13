// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { FitnessEvaluatorService } from './fitness-evaluator.service';
import { MutationEngineService } from './mutation-engine.service';
import { EvolutionEngineService } from './evolution-engine.service';
import {
  IShift,
  ISchedulingScenario,
  IEvolutionProgress,
  DEFAULT_PENALTY_WEIGHTS
} from '../../../models/automation/conductor/scheduling.models';
import { IScheduleAgent, ScheduleAgent } from '../../../models/automation/agent/schedule-agent.model';
import { IWorkScheduleClient } from '../../../models/schedule/work-schedule-class';
import {
  CoreShift,
  CoreAgent,
  CoreConfig,
  CoreResultData,
  CoreProgressData,
  calculateFitness as coreCalculateFitness,
  evaluateHardConstraints as coreEvaluateHardConstraints,
  createGreedyScenario as coreCreateGreedyScenario,
  createSeededRng,
  runEvolution
} from './evolution-core';

function makeClient(overrides: Partial<IWorkScheduleClient> = {}): IWorkScheduleClient {
  return {
    id: 'client1',
    name: 'Doe',
    firstName: 'John',
    ...overrides
  } as IWorkScheduleClient;
}

function makeScheduleAgent(id: string, overrides: Partial<IScheduleAgent> = {}): IScheduleAgent {
  const agent = new ScheduleAgent(id, makeClient({ id, name: `Agent${id}`, firstName: `First${id}` }));
  agent.currentHours = overrides.currentHours ?? 0;
  agent.guaranteedHours = overrides.guaranteedHours ?? 40;
  agent.maxConsecutiveDays = overrides.maxConsecutiveDays ?? 5;
  agent.minRestHours = overrides.minRestHours ?? 11;
  if (overrides.currentState) {
    agent.currentState = overrides.currentState;
  } else {
    agent.currentState = { physiology: { hunger: 0, satiety: 1 }, psychology: { greed: 0, disgust: 0 }, motivation: 0.8 };
  }
  return agent;
}

function makeIShift(overrides: Partial<IShift> = {}): IShift {
  return {
    id: 'shift1',
    name: 'Morning',
    date: new Date('2026-03-01'),
    startTime: '08:00',
    endTime: '16:00',
    hours: 8,
    requiredAssignments: 1,
    priority: 5,
    ...overrides
  };
}

function toCoreShift(shift: IShift): CoreShift {
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

function toCoreAgent(agent: IScheduleAgent): CoreAgent {
  return {
    id: agent.id,
    currentHours: agent.currentHours,
    guaranteedHours: agent.guaranteedHours,
    maxConsecutiveDays: agent.maxConsecutiveDays,
    minRestHours: agent.minRestHours,
    motivation: agent.currentState.motivation,
    maxDailyHours: agent.maxDailyHours,
    maxWeeklyHours: agent.maxWeeklyHours,
    maxOptimalGap: agent.maxOptimalGap
  };
}

describe('Evolution Integration Tests', () => {

  describe('FitnessEvaluatorService <-> evolution-core consistency', () => {
    let service: FitnessEvaluatorService;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      service = TestBed.inject(FitnessEvaluatorService);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should produce same fitness as core for identical inputs', () => {
      const shift = makeIShift();
      const agent = makeScheduleAgent('a1');
      const weights = DEFAULT_PENALTY_WEIGHTS;

      const scenario: ISchedulingScenario = {
        id: 'test',
        generation: 0,
        assignments: [{ shiftId: 'shift1', agentId: 'a1', motivationScore: 0.8, timestamp: new Date() }],
        fitness: 0,
        coverage: 0,
        avgMotivation: 0,
        violationCount: 0,
        unassignedShifts: [],
        chromosome: new Map(),
        penaltyScore: 0,
        hardViolations: 0
      };

      service.setPenaltyWeights(weights);
      service.calculateFitness(scenario, [shift], [agent]);

      const coreScenario = {
        id: 'test',
        assignments: [{ shiftId: 'shift1', agentId: 'a1', motivationScore: 0.8 }],
        fitness: 0,
        coverage: 0,
        penaltyScore: 0,
        hardViolations: 0
      };

      coreCalculateFitness(coreScenario, [toCoreShift(shift)], [toCoreAgent(agent)], weights);

      expect(scenario.fitness).toBeCloseTo(coreScenario.fitness, 5);
      expect(scenario.penaltyScore).toBeCloseTo(coreScenario.penaltyScore, 5);
      expect(scenario.hardViolations).toBe(coreScenario.hardViolations);
      expect(scenario.coverage).toBeCloseTo(coreScenario.coverage, 5);
    });

    it('should detect same hard violation count as core', () => {
      const shifts = [
        makeIShift({ id: 's1', startTime: '08:00', endTime: '14:00', hours: 6 }),
        makeIShift({ id: 's2', startTime: '10:00', endTime: '16:00', hours: 6 })
      ];
      const agent = makeScheduleAgent('a1');

      const scenario: ISchedulingScenario = {
        id: 'test',
        generation: 0,
        assignments: [
          { shiftId: 's1', agentId: 'a1', motivationScore: 0.8, timestamp: new Date() },
          { shiftId: 's2', agentId: 'a1', motivationScore: 0.8, timestamp: new Date() }
        ],
        fitness: 0, coverage: 0, avgMotivation: 0, violationCount: 0,
        unassignedShifts: [], chromosome: new Map(), penaltyScore: 0, hardViolations: 0
      };

      const serviceViolations = service.evaluateHardConstraints(scenario, shifts, [agent]);

      const coreScenario = {
        id: 'test',
        assignments: [
          { shiftId: 's1', agentId: 'a1', motivationScore: 0.8 },
          { shiftId: 's2', agentId: 'a1', motivationScore: 0.8 }
        ],
        fitness: 0, coverage: 0, penaltyScore: 0, hardViolations: 0
      };
      const coreViolationCount = coreEvaluateHardConstraints(
        coreScenario,
        shifts.map(toCoreShift),
        [toCoreAgent(agent)]
      );

      expect(serviceViolations.length).toBe(coreViolationCount);
    });

    it('should give detailed descriptions while core gives only count', () => {
      const shifts = [
        makeIShift({ id: 's1', hours: 6 }),
        makeIShift({ id: 's2', hours: 6 })
      ];
      const agent = makeScheduleAgent('a1');
      const scenario: ISchedulingScenario = {
        id: 'test', generation: 0,
        assignments: [
          { shiftId: 's1', agentId: 'a1', motivationScore: 0.8, timestamp: new Date() },
          { shiftId: 's2', agentId: 'a1', motivationScore: 0.8, timestamp: new Date() }
        ],
        fitness: 0, coverage: 0, avgMotivation: 0, violationCount: 0,
        unassignedShifts: [], chromosome: new Map(), penaltyScore: 0, hardViolations: 0
      };

      const violations = service.evaluateHardConstraints(scenario, shifts, [agent]);
      for (const v of violations) {
        expect(v.type).toBe('hard');
        expect(v.agentId).toBeTruthy();
        expect(v.description).toBeTruthy();
        expect(v.description.length).toBeGreaterThan(5);
      }
    });
  });

  describe('MutationEngineService <-> evolution-core consistency', () => {
    let service: MutationEngineService;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      service = TestBed.inject(MutationEngineService);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should use createSeededRng for deterministic results', () => {
      service.setRandomSeed(42);
      const shifts = [makeIShift({ id: 's1' }), makeIShift({ id: 's2', date: new Date('2026-03-02') })];
      const agents = [makeScheduleAgent('a1'), makeScheduleAgent('a2')];

      const s1 = service.createGreedyScenario(shifts, agents, 0, 0);

      service.setRandomSeed(42);
      const s2 = service.createGreedyScenario(shifts, agents, 0, 0);

      expect(s1.assignments.length).toBe(s2.assignments.length);
      for (let i = 0; i < s1.assignments.length; i++) {
        expect(s1.assignments[i].shiftId).toBe(s2.assignments[i].shiftId);
        expect(s1.assignments[i].agentId).toBe(s2.assignments[i].agentId);
      }
    });

    it('createGreedyScenario should delegate to core and produce same assignments', () => {
      service.setRandomSeed(42);
      const shifts = [
        makeIShift({ id: 's1', priority: 10 }),
        makeIShift({ id: 's2', priority: 5, date: new Date('2026-03-02') })
      ];
      const agents = [
        makeScheduleAgent('a1', { guaranteedHours: 40 }),
        makeScheduleAgent('a2', { guaranteedHours: 20 })
      ];

      const serviceResult = service.createGreedyScenario(shifts, agents, 0, 0);

      const coreResult = coreCreateGreedyScenario(
        shifts.map(toCoreShift),
        agents.map(toCoreAgent),
        0,
        createSeededRng(42)
      );

      expect(serviceResult.assignments.length).toBe(coreResult.assignments.length);
      for (let i = 0; i < serviceResult.assignments.length; i++) {
        expect(serviceResult.assignments[i].shiftId).toBe(coreResult.assignments[i].shiftId);
        expect(serviceResult.assignments[i].agentId).toBe(coreResult.assignments[i].agentId);
      }
    });

    it('crossoverBlock should produce valid children', () => {
      service.setRandomSeed(42);
      const shifts = [
        makeIShift({ id: 's1', date: new Date('2026-03-01') }),
        makeIShift({ id: 's2', date: new Date('2026-03-02') })
      ];

      const p1: ISchedulingScenario = {
        id: 'p1', generation: 0,
        assignments: [
          { shiftId: 's1', agentId: 'a1', motivationScore: 0.9, timestamp: new Date() },
          { shiftId: 's2', agentId: 'a1', motivationScore: 0.9, timestamp: new Date() }
        ],
        fitness: 0.8, coverage: 1, avgMotivation: 0.9, violationCount: 0,
        unassignedShifts: [], chromosome: new Map(), penaltyScore: 100, hardViolations: 0
      };
      const p2: ISchedulingScenario = {
        id: 'p2', generation: 0,
        assignments: [
          { shiftId: 's1', agentId: 'a2', motivationScore: 0.7, timestamp: new Date() },
          { shiftId: 's2', agentId: 'a2', motivationScore: 0.7, timestamp: new Date() }
        ],
        fitness: 0.6, coverage: 1, avgMotivation: 0.7, violationCount: 0,
        unassignedShifts: [], chromosome: new Map(), penaltyScore: 80, hardViolations: 0
      };

      const [c1, c2] = service.crossoverBlock(p1, p2, shifts);
      expect(c1.assignments.length).toBeGreaterThan(0);
      expect(c2.assignments.length).toBeGreaterThan(0);
      expect(c1.fitness).toBe(0);
      expect(c2.fitness).toBe(0);
    });
  });

  describe('EvolutionEngineService full pipeline', () => {
    let service: EvolutionEngineService;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      service = TestBed.inject(EvolutionEngineService);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should evolve and produce a result with coverage > 0', async () => {
      const shifts = [
        makeIShift({ id: 's1', date: new Date('2026-03-01') }),
        makeIShift({ id: 's2', date: new Date('2026-03-02') }),
        makeIShift({ id: 's3', date: new Date('2026-03-03') })
      ];
      const agents = [
        makeScheduleAgent('a1', { guaranteedHours: 20 }),
        makeScheduleAgent('a2', { guaranteedHours: 20 })
      ];

      const progressCallbacks: IEvolutionProgress[] = [];
      const result = await service.evolve(
        shifts,
        agents,
        (progress) => progressCallbacks.push(progress),
        undefined
      );

      expect(result).toBeTruthy();
      expect(result.bestScenario).toBeTruthy();
      expect(result.bestScenario.coverage).toBeGreaterThan(0);
      expect(result.bestScenario.fitness).toBeGreaterThan(0);
      expect(result.finalGeneration).toBeGreaterThan(0);
      expect(result.message).toBeTruthy();
      expect(progressCallbacks.length).toBeGreaterThan(0);
    });

    it('should support cancellation', async () => {
      const shifts = Array.from({ length: 20 }, (_, i) =>
        makeIShift({ id: `s${i}`, date: new Date(`2026-03-${String(i % 28 + 1).padStart(2, '0')}`) })
      );
      const agents = Array.from({ length: 10 }, (_, i) =>
        makeScheduleAgent(`a${i}`, { guaranteedHours: 40 })
      );
      const cancellationToken = { isCancelled: true };

      const result = await service.evolve(shifts, agents, undefined, cancellationToken);
      expect(result.message).toBe('Cancelled by user');
    });
  });

  describe('Worker message contract', () => {
    it('runEvolution should produce progress with correct shape', () => {
      const shifts: CoreShift[] = [
        { id: 's1', name: 'M', date: '2026-03-01', startTime: '08:00', endTime: '16:00', hours: 8, requiredAssignments: 1, priority: 5 },
        { id: 's2', name: 'A', date: '2026-03-02', startTime: '08:00', endTime: '16:00', hours: 8, requiredAssignments: 1, priority: 5 }
      ];
      const agents: CoreAgent[] = [
        { id: 'a1', currentHours: 0, guaranteedHours: 40, maxConsecutiveDays: 5, minRestHours: 11, motivation: 0.8, maxDailyHours: 12, maxWeeklyHours: 50, maxOptimalGap: 2 }
      ];
      const config: CoreConfig = {
        populationSize: 10, maxGenerations: 10, eliteCount: 2, mutationRate: 0.15,
        crossoverRate: 0.8, convergenceThreshold: 0.001, stagnationLimit: 10,
        targetFitness: 0.95, timeLimitMs: 5000, warmStartRatio: 0.2, randomSeed: 42
      };

      const progressMessages: CoreProgressData[] = [];
      let resultMessage: CoreResultData | null = null;

      runEvolution(shifts, agents, config, DEFAULT_PENALTY_WEIGHTS, {
        onProgress: (data) => progressMessages.push(data),
        onResult: (data) => { resultMessage = data; }
      });

      expect(progressMessages.length).toBeGreaterThan(0);
      const p = progressMessages[0];
      expect(p).toHaveProperty('currentGeneration');
      expect(p).toHaveProperty('maxGenerations');
      expect(p).toHaveProperty('bestFitness');
      expect(p).toHaveProperty('avgFitness');
      expect(p).toHaveProperty('coverage');
      expect(p).toHaveProperty('timeElapsedMs');
      expect(p).toHaveProperty('stagnationCount');

      expect(resultMessage).not.toBeNull();
      const r = resultMessage!;
      expect(r).toHaveProperty('assignments');
      expect(r).toHaveProperty('fitness');
      expect(r).toHaveProperty('coverage');
      expect(r).toHaveProperty('penaltyScore');
      expect(r).toHaveProperty('hardViolations');
      expect(r).toHaveProperty('finalGeneration');
      expect(r).toHaveProperty('stopReason');
      expect(r).toHaveProperty('message');
      expect(r).toHaveProperty('timeElapsedMs');
      expect(Array.isArray(r.assignments)).toBe(true);
      if (r.assignments.length > 0) {
        expect(r.assignments[0]).toHaveProperty('shiftId');
        expect(r.assignments[0]).toHaveProperty('agentId');
        expect(r.assignments[0]).toHaveProperty('motivationScore');
      }
    });

    it('core runEvolution result should match what ConductorService expects from worker', () => {
      const shifts: CoreShift[] = [
        { id: 's1', name: 'Morning', date: '2026-03-01T00:00:00.000Z', startTime: '08:00', endTime: '16:00', hours: 8, requiredAssignments: 1, priority: 5 }
      ];
      const agents: CoreAgent[] = [
        { id: 'a1', currentHours: 0, guaranteedHours: 40, maxConsecutiveDays: 5, minRestHours: 11, motivation: 0.8, maxDailyHours: 12, maxWeeklyHours: 50, maxOptimalGap: 2 }
      ];
      const config: CoreConfig = {
        populationSize: 10, maxGenerations: 5, eliteCount: 2, mutationRate: 0.15,
        crossoverRate: 0.8, convergenceThreshold: 0.001, stagnationLimit: 5,
        targetFitness: 0.95, timeLimitMs: 5000, warmStartRatio: 0.2, randomSeed: 42
      };

      let result: CoreResultData | null = null;
      runEvolution(shifts, agents, config, DEFAULT_PENALTY_WEIGHTS, {
        onProgress: () => {},
        onResult: (data) => { result = data; }
      });

      expect(result).not.toBeNull();
      expect(typeof result!.fitness).toBe('number');
      expect(typeof result!.coverage).toBe('number');
      expect(typeof result!.penaltyScore).toBe('number');
      expect(typeof result!.hardViolations).toBe('number');
      expect(typeof result!.finalGeneration).toBe('number');
      expect(typeof result!.stopReason).toBe('string');
      expect(typeof result!.message).toBe('string');
      expect(typeof result!.timeElapsedMs).toBe('number');
      expect(result!.fitness).toBeGreaterThanOrEqual(0);
      expect(result!.fitness).toBeLessThanOrEqual(1);
    });
  });
});
