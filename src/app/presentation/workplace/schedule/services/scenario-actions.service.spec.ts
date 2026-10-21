// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { ScenarioActionsService } from './scenario-actions.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS, ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { SCENARIO_NOT_ACTIVE_ERROR_CODE } from 'src/app/domain/models/schedule/scenario-not-active.model';
import { SCENARIO_STALE_ERROR_CODE } from 'src/app/domain/models/schedule/scenario-stale.model';
import { LocaleService } from 'src/app/application/services/locale.service';
import { setCompanyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';
import { IScenarioAcceptResult } from 'src/app/domain/interfaces/scenario-accept-result.interface';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';

interface OpenModalOptions {
  type: ModalType;
  message: string;
  onConfirm: () => void;
}

describe('ScenarioActionsService', () => {
  const GROUP_ID = 'group-1';
  const scenario = { id: 'scenario-1', token: 'token-1', name: 'Plan A' } as IAnalyseScenario;
  const NO_OVERRIDES = { overrideBlock: false, overrideStale: false };

  let held: Set<string>;
  let modalService: { openModal: ReturnType<typeof vi.fn> };
  let toastShowService: { showError: ReturnType<typeof vi.fn>; showInfo: ReturnType<typeof vi.fn> };
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
          useValue: {
            instant: (key: string, params?: Record<string, unknown>) =>
              params ? `${key}:${Object.values(params).join('|')}` : key,
          },
        },
        { provide: LocaleService, useValue: { getLocale: () => 'de-CH' } },
      ],
    });

    return TestBed.inject(ScenarioActionsService);
  };

  const lastModal = (): OpenModalOptions => modalService.openModal.mock.calls.at(-1)![0] as OpenModalOptions;

  beforeEach(() => {
    held = new Set<string>();
    modalService = { openModal: vi.fn() };
    toastShowService = { showError: vi.fn(), showInfo: vi.fn() };
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
      expect(scenarioService.acceptScenario).toHaveBeenCalledWith('scenario-1', NO_OVERRIDES);
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
      expect(scenarioService.acceptScenario).toHaveBeenLastCalledWith('scenario-1', { overrideBlock: true, overrideStale: false });
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

  describe('a stale scenario (the original plan changed after it was created)', () => {
    const stale = (acceptedScenarioNames: string[] = ['Plan B']): HttpErrorResponse =>
      conflict({
        detail: 'stale',
        errorCode: SCENARIO_STALE_ERROR_CODE,
        changedEntryCount: 3,
        lastChangeUtc: '2026-04-20T10:00:00Z',
        acceptedScenarioNames,
      });

    beforeEach(() => setCompanyTimeZone('UTC'));
    afterEach(() => setCompanyTimeZone(null));

    it('asks before overwriting the newer changes and names what changed', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValueOnce(throwError(() => stale()));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(modalService.openModal).toHaveBeenCalledTimes(2);
      const message = lastModal().message;
      expect(message).toContain('scenario.accept.staleMessage:3|');
      expect(message).toContain('20.04.2026');
      expect(message).toContain('10:00');
      expect(message).toContain('scenario.accept.staleAcceptedScenarios:Plan B');
      expect(toastShowService.showError).not.toHaveBeenCalled();
    });

    it('accepts again with only the stale acknowledgement once confirmed', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValueOnce(throwError(() => stale()));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();
      lastModal().onConfirm();

      // Assert
      expect(scenarioService.acceptScenario).toHaveBeenCalledTimes(2);
      expect(scenarioService.acceptScenario).toHaveBeenLastCalledWith('scenario-1', {
        overrideBlock: false,
        overrideStale: true,
      });
    });

    it('leaves out the accepted-scenarios line when none were accepted', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValueOnce(throwError(() => stale([])));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(lastModal().message).not.toContain('scenario.accept.staleAcceptedScenarios');
    });

    it('shows the stale warning to a planer too, it is not a supervisor right', () => {
      // Arrange
      held.add(PERMISSIONS.CanEditSchedule);
      scenarioService.acceptScenario.mockReturnValueOnce(throwError(() => stale()));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(modalService.openModal).toHaveBeenCalledTimes(2);
      expect(lastModal().message).toContain('scenario.accept.staleMessage');
    });

    it('still shows the compliance block after the stale confirmation and keeps both acknowledgements', () => {
      // Arrange
      held.add(ROLE_AUTHORISED);
      scenarioService.acceptScenario
        .mockReturnValueOnce(throwError(() => stale()))
        .mockReturnValueOnce(throwError(() => conflict({ detail: 'blocked' })))
        .mockReturnValueOnce(of(undefined));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();
      lastModal().onConfirm();

      // Assert
      expect(modalService.openModal).toHaveBeenCalledTimes(3);
      expect(lastModal().message).toBe('blocked');

      lastModal().onConfirm();
      expect(scenarioService.acceptScenario).toHaveBeenLastCalledWith('scenario-1', {
        overrideBlock: true,
        overrideStale: true,
      });
    });

    it('never offers the compliance override for the stale conflict itself', () => {
      // Arrange
      held.add(ROLE_ADMIN);
      scenarioService.acceptScenario.mockReturnValueOnce(throwError(() => stale()));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(lastModal().message).not.toBe('stale');
      expect(lastModal().message).toContain('scenario.accept.staleMessage');
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

  describe('entries on locked days', () => {
    const acceptResult = (skippedLockedTotal: number): IScenarioAcceptResult => ({
      accepted: true,
      skippedLockedWorks: 0,
      skippedLockedBreaks: 0,
      skippedLockedNotes: 0,
      skippedLockedWorkChanges: 0,
      skippedLockedExpenses: skippedLockedTotal,
      skippedLockedTotal,
    });

    it('warns with the number of entries that were not taken over', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValue(of(acceptResult(3)));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(toastShowService.showInfo).toHaveBeenCalledTimes(1);
      const [message, , , icon] = toastShowService.showInfo.mock.calls[0];
      expect(message).toBe('scenario.accept.lockedSkipped:3');
      expect(icon).toBe(TOAST_ICONS.WARNING);
    });

    it('shows nothing when every entry was taken over', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValue(of(acceptResult(0)));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(toastShowService.showInfo).not.toHaveBeenCalled();
    });

    it('shows nothing for an empty response of an older backend', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValue(of(null));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(toastShowService.showInfo).not.toHaveBeenCalled();
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
