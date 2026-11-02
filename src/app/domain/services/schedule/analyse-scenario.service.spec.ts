// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { IWizard4CandidateNotification } from 'src/app/domain/interfaces/wizard4-candidate-notification.interface';
import { IAutofillRunPresence } from 'src/app/domain/interfaces/autofill-run-presence.interface';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { DataAnalyseScenarioService } from 'src/app/infrastructure/api/schedule/data-analyse-scenario.service';
import { ScenarioVariantService } from './scenario-variant.service';

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
    variantIds: [],
    status: AnalyseScenarioStatus.Active,
    ...overrides,
  };
}

describe('AnalyseScenarioService', () => {
  let service: AnalyseScenarioService;
  let leaveVariantMode: ReturnType<typeof vi.fn>;
  let createRequest: ReturnType<typeof vi.fn>;
  let getRequest: ReturnType<typeof vi.fn>;
  let getByGroupRequest: ReturnType<typeof vi.fn>;

  let wizard4CandidatesChanged$: Subject<IWizard4CandidateNotification>;
  let autofillRunEnded$: Subject<IAutofillRunPresence>;

  beforeEach(() => {
    wizard4CandidatesChanged$ = new Subject<IWizard4CandidateNotification>();
    autofillRunEnded$ = new Subject<IAutofillRunPresence>();
    leaveVariantMode = vi.fn();
    createRequest = vi.fn();
    getRequest = vi.fn();
    getByGroupRequest = vi.fn().mockReturnValue(of([]));
    // Arrange
    TestBed.configureTestingModule({
      providers: [
        AnalyseScenarioService,
        { provide: DataAnalyseScenarioService, useValue: { getByGroup: getByGroupRequest, create: createRequest, get: getRequest } },
        { provide: ScenarioVariantService, useValue: { leave: leaveVariantMode } },
        {
          provide: SCHEDULE_SIGNALR,
          useValue: { wizard4CandidatesChanged$, autofillRunEnded$ },
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

    it('should end variant mode so scenario mode and variant mode are never active together', () => {
      // Act
      service.selectScenario(createScenario());

      // Assert
      expect(leaveVariantMode).toHaveBeenCalledTimes(1);
    });
  });

  describe('createScenario', () => {
    it('should end variant mode when the created scenario becomes the active one', () => {
      // Arrange
      const created = createScenario({ id: 'scenario-new' });
      createRequest.mockReturnValue(of(created));

      // Act
      service.createScenario({ name: 'New', fromDate: '2026-01-01', untilDate: '2026-01-31' }).subscribe();

      // Assert
      expect(leaveVariantMode).toHaveBeenCalledTimes(1);
      expect(service.activeScenario()).toEqual(created);
    });
  });

  describe('openCreatedScenario', () => {
    it('should read the scenario from the server, so the keys it inherited are known', async () => {
      // Arrange
      getRequest.mockReturnValue(of(createScenario({ id: 'child', variantIds: ['key-1'] })));

      // Act
      const opened = await service.openCreatedScenario('child');

      // Assert
      expect(opened).toBe(true);
      expect(service.activeScenario()?.variantIds).toEqual(['key-1']);
      expect(service.scenarios().map((s) => s.id)).toEqual(['child']);
      expect(leaveVariantMode).toHaveBeenCalled();
    });

    it('should keep the view and reload the list when the read fails', async () => {
      // Arrange
      getRequest.mockReturnValue(throwError(() => new Error('offline')));

      // Act
      const opened = await service.openCreatedScenario('child');

      // Assert
      expect(opened).toBe(false);
      expect(service.activeScenario()).toBeNull();
      expect(getByGroupRequest).toHaveBeenCalledTimes(1);
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

  describe('autofill runs', () => {
    it('should reload the list of the last loaded group when an autofill run ends', () => {
      // Arrange
      service.loadScenarios('group-7');
      const loadSpy = vi.spyOn(service, 'loadScenarios').mockImplementation(() => {});

      // Act
      autofillRunEnded$.next({
        runId: 'run-1',
        groupId: 'group-7',
        periodFrom: '2026-08-01',
        periodUntil: '2026-08-31',
        progressPercent: null,
      });

      // Assert
      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(loadSpy).toHaveBeenCalledWith('group-7');
    });

    it('should not reload the list when an autofill run of another group ends', () => {
      // Arrange
      service.loadScenarios('group-7');
      const loadSpy = vi.spyOn(service, 'loadScenarios').mockImplementation(() => {});

      // Act
      autofillRunEnded$.next({
        runId: 'run-2',
        groupId: 'group-8',
        periodFrom: '2026-08-01',
        periodUntil: '2026-08-31',
        progressPercent: null,
      });

      // Assert
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('should reload the unfiltered list when an autofill run of any group ends', () => {
      // Arrange
      service.loadScenarios(undefined);
      const loadSpy = vi.spyOn(service, 'loadScenarios').mockImplementation(() => {});

      // Act
      autofillRunEnded$.next({
        runId: 'run-3',
        groupId: 'group-8',
        periodFrom: '2026-08-01',
        periodUntil: '2026-08-31',
        progressPercent: null,
      });

      // Assert
      expect(loadSpy).toHaveBeenCalledWith(undefined);
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
      variantIds: [],
      status: AnalyseScenarioStatus.Active,
      ...overrides,
    };
  }
});
