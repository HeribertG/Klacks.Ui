import {
  createSeededRng,
  generateId,
  evaluateHardConstraints,
  evaluateSoftConstraints,
  calculateFitness,
  calculateFairness,
  calculateCoverage,
  createRandomScenario,
  createGreedyScenario,
  mutateSwap,
  mutateRemove,
  mutateRepair,
  mutateHungryFirst,
  mutate,
  crossoverBlock,
  tournamentSelect,
  runEvolution,
  CoreShift,
  CoreAgent,
  CoreScenario,
  CoreConfig,
  CorePenaltyWeights,
  CoreAssignment,
  CoreProgressData,
  CoreResultData,
  RngFn
} from './evolution-core';

function makeShift(overrides: Partial<CoreShift> = {}): CoreShift {
  return {
    id: 'shift1',
    name: 'Morning',
    date: '2026-03-01T00:00:00.000Z',
    startTime: '08:00',
    endTime: '16:00',
    hours: 8,
    requiredAssignments: 1,
    priority: 5,
    ...overrides
  };
}

function makeAgent(overrides: Partial<CoreAgent> = {}): CoreAgent {
  return {
    id: 'agent1',
    currentHours: 0,
    guaranteedHours: 40,
    maxConsecutiveDays: 5,
    minRestHours: 11,
    motivation: 0.8,
    ...overrides
  };
}

function makeScenario(overrides: Partial<CoreScenario> = {}): CoreScenario {
  return {
    id: 'test_scenario',
    assignments: [],
    fitness: 0,
    coverage: 0,
    penaltyScore: 0,
    hardViolations: 0,
    ...overrides
  };
}

function makeConfig(overrides: Partial<CoreConfig> = {}): CoreConfig {
  return {
    populationSize: 10,
    maxGenerations: 20,
    eliteCount: 2,
    mutationRate: 0.15,
    crossoverRate: 0.8,
    convergenceThreshold: 0.001,
    stagnationLimit: 10,
    targetFitness: 0.95,
    timeLimitMs: 5000,
    warmStartRatio: 0.2,
    ...overrides
  };
}

function makeWeights(overrides: Partial<CorePenaltyWeights> = {}): CorePenaltyWeights {
  return {
    hardViolation: -1000,
    softViolation: -200,
    coverageBonus: 100,
    motivationBonus: 50,
    fairnessBonus: 30,
    ...overrides
  };
}

function freshRng(): RngFn {
  return createSeededRng(42);
}

describe('evolution-core', () => {

  describe('createSeededRng', () => {
    it('should produce deterministic values', () => {
      const rng1 = createSeededRng(123);
      const rng2 = createSeededRng(123);
      const values1 = [rng1(), rng1(), rng1()];
      const values2 = [rng2(), rng2(), rng2()];
      expect(values1).toEqual(values2);
    });

    it('should produce values between 0 and 1', () => {
      const rng = createSeededRng(999);
      for (let i = 0; i < 100; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('should produce different values for different seeds', () => {
      const rng1 = createSeededRng(1);
      const rng2 = createSeededRng(2);
      const v1 = [rng1(), rng1(), rng1()];
      const v2 = [rng2(), rng2(), rng2()];
      expect(v1).not.toEqual(v2);
    });
  });

  describe('generateId', () => {
    it('should return a string starting with evo_', () => {
      const rng = freshRng();
      const id = generateId(rng);
      expect(id).toMatch(/^evo_\d+_\d+$/);
    });

    it('should produce different IDs with repeated calls', () => {
      const rng = freshRng();
      const id1 = generateId(rng);
      const id2 = generateId(rng);
      expect(id1).not.toBe(id2);
    });
  });

  describe('evaluateHardConstraints', () => {
    it('should return 0 violations for an empty scenario', () => {
      const scenario = makeScenario();
      const violations = evaluateHardConstraints(scenario, [makeShift()], [makeAgent()]);
      expect(violations).toBe(0);
    });

    it('should detect daily hours exceeding 10h', () => {
      const shifts = [
        makeShift({ id: 's1', startTime: '06:00', endTime: '12:00', hours: 6 }),
        makeShift({ id: 's2', startTime: '12:00', endTime: '17:00', hours: 5 })
      ];
      const scenario = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'agent1', motivationScore: 0.8 },
          { shiftId: 's2', agentId: 'agent1', motivationScore: 0.8 }
        ]
      });
      const violations = evaluateHardConstraints(scenario, shifts, [makeAgent()]);
      expect(violations).toBeGreaterThan(0);
    });

    it('should detect overlapping time slots on the same day', () => {
      const shifts = [
        makeShift({ id: 's1', startTime: '08:00', endTime: '14:00', hours: 6 }),
        makeShift({ id: 's2', startTime: '12:00', endTime: '18:00', hours: 6 })
      ];
      const scenario = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'agent1', motivationScore: 0.8 },
          { shiftId: 's2', agentId: 'agent1', motivationScore: 0.8 }
        ]
      });
      const violations = evaluateHardConstraints(scenario, shifts, [makeAgent()]);
      expect(violations).toBeGreaterThan(0);
    });

    it('should detect exceeded max consecutive days', () => {
      const agent = makeAgent({ maxConsecutiveDays: 2 });
      const shifts = [
        makeShift({ id: 's1', date: '2026-03-01', startTime: '08:00', endTime: '12:00', hours: 4 }),
        makeShift({ id: 's2', date: '2026-03-02', startTime: '08:00', endTime: '12:00', hours: 4 }),
        makeShift({ id: 's3', date: '2026-03-03', startTime: '08:00', endTime: '12:00', hours: 4 })
      ];
      const scenario = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'agent1', motivationScore: 0.8 },
          { shiftId: 's2', agentId: 'agent1', motivationScore: 0.8 },
          { shiftId: 's3', agentId: 'agent1', motivationScore: 0.8 }
        ]
      });
      const violations = evaluateHardConstraints(scenario, shifts, [agent]);
      expect(violations).toBeGreaterThan(0);
    });

    it('should detect insufficient rest between days', () => {
      const agent = makeAgent({ minRestHours: 11 });
      const shifts = [
        makeShift({ id: 's1', date: '2026-03-01', startTime: '18:00', endTime: '23:00', hours: 5 }),
        makeShift({ id: 's2', date: '2026-03-02', startTime: '06:00', endTime: '11:00', hours: 5 })
      ];
      const scenario = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'agent1', motivationScore: 0.8 },
          { shiftId: 's2', agentId: 'agent1', motivationScore: 0.8 }
        ]
      });
      const violations = evaluateHardConstraints(scenario, shifts, [agent]);
      expect(violations).toBeGreaterThan(0);
    });

    it('should return 0 violations for a valid single assignment', () => {
      const scenario = makeScenario({
        assignments: [{ shiftId: 'shift1', agentId: 'agent1', motivationScore: 0.8 }]
      });
      const violations = evaluateHardConstraints(scenario, [makeShift()], [makeAgent()]);
      expect(violations).toBe(0);
    });
  });

  describe('evaluateSoftConstraints', () => {
    it('should return 0 for an empty scenario', () => {
      const violations = evaluateSoftConstraints(makeScenario(), [makeShift()], [makeAgent()]);
      expect(violations).toBe(0);
    });

    it('should detect low motivation assignments', () => {
      const scenario = makeScenario({
        assignments: [{ shiftId: 'shift1', agentId: 'agent1', motivationScore: 0.1 }]
      });
      const violations = evaluateSoftConstraints(scenario, [makeShift()], [makeAgent()]);
      expect(violations).toBeGreaterThan(0);
    });

    it('should detect guaranteed hours exceeded by 20%', () => {
      const agent = makeAgent({ currentHours: 45, guaranteedHours: 40 });
      const shift = makeShift({ hours: 8 });
      const scenario = makeScenario({
        assignments: [{ shiftId: 'shift1', agentId: 'agent1', motivationScore: 0.8 }]
      });
      const violations = evaluateSoftConstraints(scenario, [shift], [agent]);
      expect(violations).toBeGreaterThan(0);
    });

    it('should not penalize fair distribution', () => {
      const agents = [
        makeAgent({ id: 'a1' }),
        makeAgent({ id: 'a2' })
      ];
      const shifts = [
        makeShift({ id: 's1', hours: 4 }),
        makeShift({ id: 's2', hours: 4 })
      ];
      const scenario = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'a1', motivationScore: 0.8 },
          { shiftId: 's2', agentId: 'a2', motivationScore: 0.8 }
        ]
      });
      const violations = evaluateSoftConstraints(scenario, shifts, agents);
      expect(violations).toBe(0);
    });
  });

  describe('calculateFitness', () => {
    it('should set fitness and coverage on scenario', () => {
      const shift = makeShift();
      const agent = makeAgent();
      const scenario = makeScenario({
        assignments: [{ shiftId: 'shift1', agentId: 'agent1', motivationScore: 0.8 }]
      });
      calculateFitness(scenario, [shift], [agent], makeWeights());
      expect(scenario.fitness).toBeGreaterThan(0);
      expect(scenario.coverage).toBe(1);
    });

    it('should give higher fitness for full coverage vs partial', () => {
      const shifts = [
        makeShift({ id: 's1', date: '2026-03-01', hours: 4, startTime: '08:00', endTime: '12:00' }),
        makeShift({ id: 's2', date: '2026-03-02', hours: 4, startTime: '08:00', endTime: '12:00' })
      ];
      const agents = [makeAgent({ id: 'a1' }), makeAgent({ id: 'a2' })];
      const weights = makeWeights();

      const full = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'a1', motivationScore: 0.8 },
          { shiftId: 's2', agentId: 'a2', motivationScore: 0.8 }
        ]
      });
      const partial = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'a1', motivationScore: 0.8 }
        ]
      });

      calculateFitness(full, shifts, agents, weights);
      calculateFitness(partial, shifts, agents, weights);
      expect(full.fitness).toBeGreaterThan(partial.fitness);
    });

    it('should penalize hard constraint violations', () => {
      const shifts = [
        makeShift({ id: 's1', startTime: '08:00', endTime: '14:00', hours: 6 }),
        makeShift({ id: 's2', startTime: '10:00', endTime: '16:00', hours: 6 })
      ];
      const agent = makeAgent();
      const weights = makeWeights();

      const violating = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'agent1', motivationScore: 0.8 },
          { shiftId: 's2', agentId: 'agent1', motivationScore: 0.8 }
        ]
      });
      const clean = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'agent1', motivationScore: 0.8 }
        ]
      });

      calculateFitness(violating, shifts, [agent], weights);
      calculateFitness(clean, shifts, [agent], weights);

      expect(violating.hardViolations).toBeGreaterThan(0);
      expect(clean.hardViolations).toBe(0);
    });

    it('should set fitness 0 for empty shifts', () => {
      const scenario = makeScenario();
      calculateFitness(scenario, [], [makeAgent()], makeWeights());
      expect(scenario.fitness).toBe(0);
    });
  });

  describe('calculateFairness', () => {
    it('should return 1 for equal distribution', () => {
      const scenario = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'a1', motivationScore: 0.5 },
          { shiftId: 's2', agentId: 'a2', motivationScore: 0.5 }
        ]
      });
      const agents = [makeAgent({ id: 'a1' }), makeAgent({ id: 'a2' })];
      expect(calculateFairness(scenario, agents)).toBe(1);
    });

    it('should return < 1 for unequal distribution', () => {
      const scenario = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'a1', motivationScore: 0.5 },
          { shiftId: 's2', agentId: 'a1', motivationScore: 0.5 },
          { shiftId: 's3', agentId: 'a1', motivationScore: 0.5 },
          { shiftId: 's4', agentId: 'a2', motivationScore: 0.5 }
        ]
      });
      const agents = [makeAgent({ id: 'a1' }), makeAgent({ id: 'a2' })];
      expect(calculateFairness(scenario, agents)).toBeLessThan(1);
    });

    it('should return 1 for empty assignments', () => {
      expect(calculateFairness(makeScenario(), [makeAgent()])).toBe(1);
    });
  });

  describe('calculateCoverage', () => {
    it('should return 1 when all shifts are fully covered', () => {
      const shifts = [makeShift({ id: 's1', requiredAssignments: 1 })];
      const scenario = makeScenario({
        assignments: [{ shiftId: 's1', agentId: 'a1', motivationScore: 0.8 }]
      });
      expect(calculateCoverage(scenario, shifts)).toBe(1);
    });

    it('should return 0.5 when half the shifts are covered', () => {
      const shifts = [
        makeShift({ id: 's1', requiredAssignments: 1 }),
        makeShift({ id: 's2', requiredAssignments: 1 })
      ];
      const scenario = makeScenario({
        assignments: [{ shiftId: 's1', agentId: 'a1', motivationScore: 0.8 }]
      });
      expect(calculateCoverage(scenario, shifts)).toBe(0.5);
    });

    it('should return 1 for empty shifts', () => {
      expect(calculateCoverage(makeScenario(), [])).toBe(1);
    });
  });

  describe('createRandomScenario', () => {
    it('should create a scenario with some assignments', () => {
      const shifts = [makeShift({ id: 's1' }), makeShift({ id: 's2' }), makeShift({ id: 's3' })];
      const agents = [makeAgent({ id: 'a1' }), makeAgent({ id: 'a2' })];
      const rng = freshRng();
      const scenario = createRandomScenario(shifts, agents, rng);
      expect(scenario.id).toMatch(/^evo_/);
      expect(scenario.fitness).toBe(0);
      expect(scenario.assignments.length).toBeGreaterThanOrEqual(0);
      expect(scenario.assignments.length).toBeLessThanOrEqual(shifts.length);
    });

    it('should be deterministic with same seed', () => {
      const shifts = [makeShift({ id: 's1' }), makeShift({ id: 's2' })];
      const agents = [makeAgent({ id: 'a1' })];
      const s1 = createRandomScenario(shifts, agents, createSeededRng(42));
      const s2 = createRandomScenario(shifts, agents, createSeededRng(42));
      expect(s1.assignments.length).toBe(s2.assignments.length);
      for (let i = 0; i < s1.assignments.length; i++) {
        expect(s1.assignments[i].shiftId).toBe(s2.assignments[i].shiftId);
        expect(s1.assignments[i].agentId).toBe(s2.assignments[i].agentId);
      }
    });
  });

  describe('createGreedyScenario', () => {
    it('should prefer agents with higher hour deficit', () => {
      const shifts = [makeShift({ id: 's1', hours: 4 })];
      const agents = [
        makeAgent({ id: 'hungry', currentHours: 0, guaranteedHours: 40, motivation: 0.5 }),
        makeAgent({ id: 'full', currentHours: 40, guaranteedHours: 40, motivation: 0.9 })
      ];
      const rng = freshRng();
      const scenario = createGreedyScenario(shifts, agents, 0, rng);
      expect(scenario.assignments.length).toBe(1);
      expect(scenario.assignments[0].agentId).toBe('hungry');
    });

    it('should respect daily hour limit', () => {
      const shifts = [
        makeShift({ id: 's1', hours: 6, startTime: '06:00', endTime: '12:00' }),
        makeShift({ id: 's2', hours: 6, startTime: '12:00', endTime: '18:00' })
      ];
      const agents = [makeAgent({ id: 'a1' })];
      const rng = freshRng();
      const scenario = createGreedyScenario(shifts, agents, 0, rng);
      const a1Assignments = scenario.assignments.filter(a => a.agentId === 'a1');
      const totalHours = a1Assignments.reduce((sum, a) => {
        const shift = shifts.find(s => s.id === a.shiftId)!;
        return sum + shift.hours;
      }, 0);
      expect(totalHours).toBeLessThanOrEqual(10);
    });

    it('should produce variation when variation > 0', () => {
      const shifts = Array.from({ length: 10 }, (_, i) =>
        makeShift({ id: `s${i}`, priority: 10 - i, date: `2026-03-0${(i % 7) + 1}` })
      );
      const agents = [makeAgent({ id: 'a1' }), makeAgent({ id: 'a2' })];
      const s1 = createGreedyScenario(shifts, agents, 0, createSeededRng(42));
      const s2 = createGreedyScenario(shifts, agents, 1, createSeededRng(42));
      const ids1 = s1.assignments.map(a => a.shiftId).sort();
      const ids2 = s2.assignments.map(a => a.shiftId).sort();
      expect(ids1.length).toBeGreaterThan(0);
      expect(ids2.length).toBeGreaterThan(0);
    });
  });

  describe('mutateSwap', () => {
    it('should swap an agent in an assignment', () => {
      const assignments: CoreAssignment[] = [
        { shiftId: 's1', agentId: 'a1', motivationScore: 0.8 }
      ];
      const agents = [makeAgent({ id: 'a1' }), makeAgent({ id: 'a2' })];
      const rng = createSeededRng(100);
      mutateSwap(assignments, agents, rng);
      expect(assignments[0].shiftId).toBe('s1');
      expect(['a1', 'a2']).toContain(assignments[0].agentId);
    });

    it('should do nothing on empty assignments', () => {
      const assignments: CoreAssignment[] = [];
      mutateSwap(assignments, [makeAgent()], freshRng());
      expect(assignments.length).toBe(0);
    });
  });

  describe('mutateRemove', () => {
    it('should remove one assignment', () => {
      const assignments: CoreAssignment[] = [
        { shiftId: 's1', agentId: 'a1', motivationScore: 0.8 },
        { shiftId: 's2', agentId: 'a2', motivationScore: 0.7 }
      ];
      mutateRemove(assignments, freshRng());
      expect(assignments.length).toBe(1);
    });

    it('should do nothing on empty assignments', () => {
      const assignments: CoreAssignment[] = [];
      mutateRemove(assignments, freshRng());
      expect(assignments.length).toBe(0);
    });
  });

  describe('mutateRepair', () => {
    it('should move assignment from overloaded to underloaded agent', () => {
      const assignments: CoreAssignment[] = [
        { shiftId: 's1', agentId: 'a1', motivationScore: 0.8 },
        { shiftId: 's2', agentId: 'a1', motivationScore: 0.8 },
        { shiftId: 's3', agentId: 'a1', motivationScore: 0.8 }
      ];
      const agents = [makeAgent({ id: 'a1' }), makeAgent({ id: 'a2' })];
      mutateRepair(assignments, agents, freshRng());
      const a2Count = assignments.filter(a => a.agentId === 'a2').length;
      expect(a2Count).toBeGreaterThan(0);
    });
  });

  describe('mutateHungryFirst', () => {
    it('should assign unassigned shift to hungriest agent', () => {
      const shifts = [makeShift({ id: 's1' }), makeShift({ id: 's2' })];
      const agents = [
        makeAgent({ id: 'hungry', currentHours: 0, guaranteedHours: 40 }),
        makeAgent({ id: 'full', currentHours: 40, guaranteedHours: 40 })
      ];
      const assignments: CoreAssignment[] = [
        { shiftId: 's1', agentId: 'full', motivationScore: 0.8 }
      ];
      mutateHungryFirst(assignments, shifts, agents, freshRng());
      expect(assignments.length).toBe(2);
      expect(assignments[1].agentId).toBe('hungry');
      expect(assignments[1].shiftId).toBe('s2');
    });

    it('should do nothing if no agent has deficit', () => {
      const shifts = [makeShift({ id: 's1' })];
      const agents = [makeAgent({ id: 'a1', currentHours: 40, guaranteedHours: 40 })];
      const assignments: CoreAssignment[] = [
        { shiftId: 's1', agentId: 'a1', motivationScore: 0.8 }
      ];
      const before = [...assignments];
      mutateHungryFirst(assignments, shifts, agents, freshRng());
      expect(assignments).toEqual(before);
    });
  });

  describe('mutate', () => {
    it('should sometimes return the same scenario (no mutation)', () => {
      const scenario = makeScenario({
        assignments: [{ shiftId: 's1', agentId: 'a1', motivationScore: 0.8 }]
      });
      const config = makeConfig({ mutationRate: 0 });
      const result = mutate(scenario, [makeShift()], [makeAgent()], config, freshRng());
      expect(result).toBe(scenario);
    });

    it('should return a new scenario when mutation happens', () => {
      const scenario = makeScenario({
        assignments: [{ shiftId: 's1', agentId: 'a1', motivationScore: 0.8 }]
      });
      const config = makeConfig({ mutationRate: 1.0 });
      const result = mutate(scenario, [makeShift()], [makeAgent()], config, freshRng());
      expect(result).not.toBe(scenario);
      expect(result.id).not.toBe(scenario.id);
    });
  });

  describe('crossoverBlock', () => {
    it('should produce two children from two parents', () => {
      const shifts = [
        makeShift({ id: 's1', date: '2026-03-01' }),
        makeShift({ id: 's2', date: '2026-03-02' })
      ];
      const p1 = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'a1', motivationScore: 0.9 },
          { shiftId: 's2', agentId: 'a1', motivationScore: 0.9 }
        ]
      });
      const p2 = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'a2', motivationScore: 0.7 },
          { shiftId: 's2', agentId: 'a2', motivationScore: 0.7 }
        ]
      });
      const [c1, c2] = crossoverBlock(p1, p2, shifts, freshRng());
      expect(c1.assignments.length).toBeGreaterThan(0);
      expect(c2.assignments.length).toBeGreaterThan(0);
      expect(c1.fitness).toBe(0);
      expect(c2.fitness).toBe(0);
    });

    it('should swap assignments by date blocks', () => {
      const shifts = [
        makeShift({ id: 's1', date: '2026-03-01' }),
        makeShift({ id: 's2', date: '2026-03-02' })
      ];
      const p1 = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'a1', motivationScore: 0.9 },
          { shiftId: 's2', agentId: 'a1', motivationScore: 0.9 }
        ]
      });
      const p2 = makeScenario({
        assignments: [
          { shiftId: 's1', agentId: 'a2', motivationScore: 0.7 },
          { shiftId: 's2', agentId: 'a2', motivationScore: 0.7 }
        ]
      });
      const [c1, c2] = crossoverBlock(p1, p2, shifts, freshRng());
      const c1AgentIds = c1.assignments.map(a => a.agentId);
      const c2AgentIds = c2.assignments.map(a => a.agentId);
      const allAgents = new Set([...c1AgentIds, ...c2AgentIds]);
      expect(allAgents.size).toBeLessThanOrEqual(2);
    });
  });

  describe('tournamentSelect', () => {
    it('should select the best from a tournament', () => {
      const population = [
        makeScenario({ id: 'low', fitness: 0.2 }),
        makeScenario({ id: 'mid', fitness: 0.5 }),
        makeScenario({ id: 'high', fitness: 0.9 })
      ];
      let bestWins = 0;
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const rng = createSeededRng(i);
        const selected = tournamentSelect(population, rng);
        if (selected.id === 'high') bestWins++;
      }
      expect(bestWins).toBeGreaterThan(trials * 0.3);
    });
  });

  describe('runEvolution', () => {
    it('should call onProgress and onResult callbacks', () => {
      const shifts = [
        makeShift({ id: 's1', date: '2026-03-01' }),
        makeShift({ id: 's2', date: '2026-03-02' }),
        makeShift({ id: 's3', date: '2026-03-03' })
      ];
      const agents = [
        makeAgent({ id: 'a1', guaranteedHours: 20 }),
        makeAgent({ id: 'a2', guaranteedHours: 20 })
      ];
      const config = makeConfig({
        populationSize: 10,
        maxGenerations: 15,
        randomSeed: 42,
        timeLimitMs: 10000
      });

      const progressCalls: CoreProgressData[] = [];
      let resultData: CoreResultData | null = null;

      runEvolution(shifts, agents, config, makeWeights(), {
        onProgress: (data) => progressCalls.push(data),
        onResult: (data) => { resultData = data; }
      });

      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[0].currentGeneration).toBe(1);
      expect(progressCalls[0].maxGenerations).toBe(15);

      expect(resultData).not.toBeNull();
      expect(resultData!.assignments.length).toBeGreaterThan(0);
      expect(resultData!.fitness).toBeGreaterThan(0);
      expect(resultData!.coverage).toBeGreaterThan(0);
      expect(resultData!.finalGeneration).toBeGreaterThan(0);
      expect(resultData!.stopReason).toBeTruthy();
      expect(resultData!.message).toBeTruthy();
    });

    it('should be deterministic with same seed', () => {
      const shifts = [makeShift({ id: 's1' }), makeShift({ id: 's2' })];
      const agents = [makeAgent({ id: 'a1' }), makeAgent({ id: 'a2' })];
      const config = makeConfig({ randomSeed: 99, populationSize: 10, maxGenerations: 10 });
      const weights = makeWeights();

      let result1: CoreResultData | null = null;
      let result2: CoreResultData | null = null;

      runEvolution(shifts, agents, config, weights, {
        onProgress: () => {},
        onResult: (data) => { result1 = data; }
      });
      runEvolution(shifts, agents, config, weights, {
        onProgress: () => {},
        onResult: (data) => { result2 = data; }
      });

      expect(result1.fitness).toBe(result2.fitness);
      expect(result1.coverage).toBe(result2.coverage);
      expect(result1.finalGeneration).toBe(result2.finalGeneration);
      expect(result1.stopReason).toBe(result2.stopReason);
    });

    it('should stop at time limit', () => {
      const shifts = Array.from({ length: 20 }, (_, i) =>
        makeShift({ id: `s${i}`, date: `2026-03-${String(i % 28 + 1).padStart(2, '0')}` })
      );
      const agents = Array.from({ length: 10 }, (_, i) =>
        makeAgent({ id: `a${i}` })
      );
      const config = makeConfig({
        populationSize: 50,
        maxGenerations: 10000,
        timeLimitMs: 100,
        randomSeed: 42
      });

      let resultData: CoreResultData | null = null;
      runEvolution(shifts, agents, config, makeWeights(), {
        onProgress: () => {},
        onResult: (data) => { resultData = data; }
      });

      expect(resultData).not.toBeNull();
      expect(resultData!.timeElapsedMs).toBeLessThan(5000);
    });

    it('should produce valid coverage value between 0 and 1', () => {
      const shifts = [makeShift({ id: 's1' }), makeShift({ id: 's2' })];
      const agents = [makeAgent({ id: 'a1' })];
      const config = makeConfig({ randomSeed: 42, maxGenerations: 5 });

      let resultData: CoreResultData | null = null;
      runEvolution(shifts, agents, config, makeWeights(), {
        onProgress: () => {},
        onResult: (data) => { resultData = data; }
      });

      expect(resultData!.coverage).toBeGreaterThanOrEqual(0);
      expect(resultData!.coverage).toBeLessThanOrEqual(1);
    });
  });
});
