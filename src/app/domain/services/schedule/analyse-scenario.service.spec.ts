// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { AnalyseScenarioStatus, IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { DataAnalyseScenarioService } from 'src/app/infrastructure/api/schedule/data-analyse-scenario.service';

function createScenario(overrides: Partial<IAnalyseScenario> = {}): IAnalyseScenario {
  return {
    id: 'scenario-1',
    name: 'Test Scenario',
    description: 'A test scenario',
    groupId: 'group-1',
    fromDate: '2026-01-01',
    untilDate: '2026-01-31',
    token: 'token-abc-123',
    createdByUser: 'user-1',
    status: AnalyseScenarioStatus.Active,
    ...overrides,
  };
}

describe('AnalyseScenarioService', () => {
  let service: AnalyseScenarioService;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [
        AnalyseScenarioService,
        { provide: DataAnalyseScenarioService, useValue: {} },
      ],
    });
    service = TestBed.inject(AnalyseScenarioService);
  });

  describe('isScenarioMode', () => {
    it('should return false initially', () => {
      // Arrange
      // (testing initial state)

      // Act
      const result = service.isScenarioMode();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('selectScenario', () => {
    it('should set the active scenario and enable scenario mode', () => {
      // Arrange
      const scenario = createScenario();

      // Act
      service.selectScenario(scenario);

      // Assert
      expect(service.isScenarioMode()).toBe(true);
      expect(service.activeScenario()).toEqual(scenario);
    });
  });

  describe('exitScenario', () => {
    it('should clear the active scenario and disable scenario mode', () => {
      // Arrange
      const scenario = createScenario();
      service.selectScenario(scenario);

      // Act
      service.exitScenario();

      // Assert
      expect(service.isScenarioMode()).toBe(false);
      expect(service.activeScenario()).toBeNull();
    });
  });

  describe('activeToken', () => {
    it('should return null when no scenario is active', () => {
      // Arrange
      // (testing initial state)

      // Act
      const result = service.activeToken();

      // Assert
      expect(result).toBeNull();
    });

    it('should return the token of the active scenario', () => {
      // Arrange
      const scenario = createScenario({ token: 'my-special-token' });

      // Act
      service.selectScenario(scenario);

      // Assert
      expect(service.activeToken()).toBe('my-special-token');
    });
  });
});
