// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { IWizard4CandidateNotification } from 'src/app/domain/interfaces/wizard4-candidate-notification.interface';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
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

  let wizard4CandidatesChanged$: Subject<IWizard4CandidateNotification>;

  beforeEach(() => {
    wizard4CandidatesChanged$ = new Subject<IWizard4CandidateNotification>();
    // Arrange
    TestBed.configureTestingModule({
      providers: [
        AnalyseScenarioService,
        { provide: DataAnalyseScenarioService, useValue: { getByGroup: () => of([]) } },
        {
          provide: SCHEDULE_SIGNALR,
          useValue: { wizard4CandidatesChanged$ },
        },
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

  describe('renameScenario', () => {
    it('should update name in scenarios list and active scenario', () => {
      // Arrange
      const scenario = createScenario({ id: 'sc-1', name: 'Old Name' });
      const updated = { ...scenario, name: 'New Name' };
      const dataService = TestBed.inject(DataAnalyseScenarioService) as unknown as { rename: ReturnType<typeof vi.fn> };
      dataService.rename = vi.fn().mockReturnValue(of(updated));

      service.scenarios.set([scenario]);
      service.activeScenario.set(scenario);

      // Act & Assert
      service.renameScenario('sc-1', 'New Name').subscribe(() => {
        expect(service.scenarios()[0].name).toBe('New Name');
        expect(service.activeScenario()?.name).toBe('New Name');
      });
    });
  });

  describe('wizard4 candidates', () => {
    it('should count only the candidates of the background optimiser', () => {
      // Arrange
      service.scenarios.set([
        makeScenario({ id: 'a', createdByUser: 'wizard4' }),
        makeScenario({ id: 'b', createdByUser: 'anna' }),
        makeScenario({ id: 'c', createdByUser: 'wizard4' }),
      ]);

      // Act
      const count = service.wizard4CandidateCount();

      // Assert
      expect(count).toBe(2);
    });

    it('should reload the list when the optimiser reports a change', () => {
      // The optimiser creates, replaces and expires candidates on its own; without the reload the list
      // would keep offering a scenario that is already gone.
      // Arrange
      const loadSpy = vi.spyOn(service, 'loadScenarios').mockImplementation(() => {});

      // Act
      wizard4CandidatesChanged$.next({
        scenarioId: 'a',
        groupId: null,
        fromDate: '2026-08-01',
        untilDate: '2026-08-31',
        changeKind: 'Superseded',
      });

      // Assert
      expect(loadSpy).toHaveBeenCalled();
    });
  });

  function makeScenario(overrides: Partial<IAnalyseScenario>): IAnalyseScenario {
    return {
      id: 'id',
      name: 'name',
      fromDate: '2026-08-01',
      untilDate: '2026-08-31',
      token: 'token',
      createdByUser: 'anna',
      status: AnalyseScenarioStatus.Active,
      ...overrides,
    };
  }
});
