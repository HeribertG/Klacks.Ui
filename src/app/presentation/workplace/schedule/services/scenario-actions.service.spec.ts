// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { ScenarioActionsService } from './scenario-actions.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS, ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { SCENARIO_NOT_ACTIVE_ERROR_CODE } from 'src/app/domain/models/schedule/scenario-not-active.model';

interface OpenModalOptions {
  type: ModalType;
  message: string;
  onConfirm: () => void;
}

describe('ScenarioActionsService', () => {
  const GROUP_ID = 'group-1';
  const scenario = { id: 'scenario-1', token: 'token-1', name: 'Plan A' } as IAnalyseScenario;

  let held: Set<string>;
  let modalService: { openModal: ReturnType<typeof vi.fn> };
  let toastShowService: { showError: ReturnType<typeof vi.fn> };
  let scenarioService: {
    activeScenario: () => IAnalyseScenario | null;
    acceptScenario: ReturnType<typeof vi.fn>;
    rejectScenario: ReturnType<typeof vi.fn>;
    exitScenario: ReturnType<typeof vi.fn>;
    loadScenarios: ReturnType<typeof vi.fn>;
  };

  const conflict = (body: Record<string, unknown>): HttpErrorResponse =>
    new HttpErrorResponse({ status: 409, error: body });

  const createService = (): ScenarioActionsService => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyseScenarioService, useValue: scenarioService },
        { provide: DataManagementScheduleService, useValue: { workFilter: { selectedGroup: GROUP_ID } } },
        { provide: ModalService, useValue: modalService },
        {
          provide: AuthorizationService,
          useValue: {
            hasPermission: (permission: string) => held.has(ROLE_ADMIN) || held.has(permission),
            hasAnyPermission: (...permissions: string[]) => permissions.some((p) => held.has(p)),
          },
        },
        { provide: ToastShowService, useValue: toastShowService },
        {
          provide: TranslateService,
          useValue: { instant: (key: string, params?: Record<string, string>) => (params ? `${key}:${params['name']}` : key) },
        },
      ],
    });

    return TestBed.inject(ScenarioActionsService);
  };

  const lastModal = (): OpenModalOptions => modalService.openModal.mock.calls.at(-1)![0] as OpenModalOptions;

  beforeEach(() => {
    held = new Set<string>();
    modalService = { openModal: vi.fn() };
    toastShowService = { showError: vi.fn() };
    scenarioService = {
      activeScenario: () => scenario,
      acceptScenario: vi.fn().mockReturnValue(of(undefined)),
      rejectScenario: vi.fn().mockReturnValue(of(undefined)),
      exitScenario: vi.fn(),
      loadScenarios: vi.fn(),
    };
  });

  describe('confirmation', () => {
    it('asks before accepting and only accepts once confirmed', () => {
      // Arrange
      const service = createService();

      // Act
      service.confirmAccept();

      // Assert
      expect(scenarioService.acceptScenario).not.toHaveBeenCalled();
      expect(lastModal().type).toBe(ModalType.Confirmation);
      expect(lastModal().message).toBe('scenario.accept.confirm:Plan A');

      lastModal().onConfirm();
      expect(scenarioService.acceptScenario).toHaveBeenCalledWith('scenario-1');
    });

    it('asks before rejecting and only rejects once confirmed', () => {
      // Arrange
      const service = createService();

      // Act
      service.confirmReject();

      // Assert
      expect(scenarioService.rejectScenario).not.toHaveBeenCalled();
      expect(lastModal().message).toBe('scenario.reject.confirm:Plan A');

      lastModal().onConfirm();
      expect(scenarioService.rejectScenario).toHaveBeenCalledWith('scenario-1');
    });

    it('does nothing without an active scenario', () => {
      // Arrange
      scenarioService.activeScenario = () => null;
      const service = createService();

      // Act
      service.confirmAccept();
      service.confirmReject();

      // Assert
      expect(modalService.openModal).not.toHaveBeenCalled();
    });

    it('returns to the original plan without asking', () => {
      // Arrange
      const service = createService();

      // Act
      service.exit();

      // Assert
      expect(scenarioService.exitScenario).toHaveBeenCalled();
      expect(modalService.openModal).not.toHaveBeenCalled();
    });
  });

  describe('blocked accept offers the override only to admin or supervisor', () => {
    beforeEach(() => {
      scenarioService.acceptScenario.mockReturnValue(throwError(() => conflict({ detail: 'blocked' })));
    });

    it('shows a plain error toast to a planer instead of an override option', () => {
      // Arrange
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(modalService.openModal).toHaveBeenCalledTimes(1);
      expect(toastShowService.showError).toHaveBeenCalledWith('blocked');
    });

    it('offers the confirmed override to a supervisor', () => {
      // Arrange
      held.add(ROLE_AUTHORISED);
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(modalService.openModal).toHaveBeenCalledTimes(2);
      expect(lastModal().message).toBe('blocked');
      expect(toastShowService.showError).not.toHaveBeenCalled();

      scenarioService.acceptScenario.mockReturnValue(of(undefined));
      lastModal().onConfirm();
      expect(scenarioService.acceptScenario).toHaveBeenLastCalledWith('scenario-1', true);
    });

    it('offers the confirmed override to an admin', () => {
      // Arrange
      held.add(ROLE_ADMIN);
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(modalService.openModal).toHaveBeenCalledTimes(2);
      expect(toastShowService.showError).not.toHaveBeenCalled();
    });
  });

  describe('a scenario that was already decided elsewhere', () => {
    const notActive = (): HttpErrorResponse =>
      conflict({ detail: 'not active', errorCode: SCENARIO_NOT_ACTIVE_ERROR_CODE });

    it('never offers the override on accept, but reloads and returns to the original', () => {
      // Arrange
      held.add(ROLE_ADMIN);
      scenarioService.acceptScenario.mockReturnValue(throwError(notActive));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(modalService.openModal).toHaveBeenCalledTimes(1);
      expect(toastShowService.showError).toHaveBeenCalledWith('scenario.notActive');
      expect(scenarioService.exitScenario).toHaveBeenCalled();
      expect(scenarioService.loadScenarios).toHaveBeenCalledWith(GROUP_ID);
    });

    it('reloads and returns to the original on reject', () => {
      // Arrange
      scenarioService.rejectScenario.mockReturnValue(throwError(notActive));
      const service = createService();

      // Act
      service.confirmReject();
      lastModal().onConfirm();

      // Assert
      expect(toastShowService.showError).toHaveBeenCalledWith('scenario.notActive');
      expect(scenarioService.exitScenario).toHaveBeenCalled();
      expect(scenarioService.loadScenarios).toHaveBeenCalledWith(GROUP_ID);
    });
  });

  describe('rights', () => {
    it('lets a user with the schedule edit right decide', () => {
      held.add(PERMISSIONS.CanEditSchedule);
      expect(createService().canDecide()).toBe(true);
    });

    it('lets an admin decide', () => {
      held.add(ROLE_ADMIN);
      expect(createService().canDecide()).toBe(true);
    });

    it('hides the decision from a user without the schedule edit right', () => {
      held.add(PERMISSIONS.CanViewSchedule);
      expect(createService().canDecide()).toBe(false);
    });
  });
});
