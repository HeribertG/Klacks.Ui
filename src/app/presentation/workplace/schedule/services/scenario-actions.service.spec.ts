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
import { SCENARIO_VARIANT_ERROR_CODES } from 'src/app/domain/constants/scenario-variant.constants';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';
import { IScenarioVariantCoverage } from 'src/app/domain/models/schedule/scenario-variant-coverage.interface';
import { LocaleService } from 'src/app/application/services/locale.service';
import { calendarDateKey, setCompanyTimeZone } from 'src/app/domain/helpers/calendar-date.helper';
import { IScenarioAcceptResult } from 'src/app/domain/interfaces/scenario-accept-result.interface';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { SCENARIO_DROPS_REAL_ABSENCE_ERROR_CODE } from 'src/app/domain/models/schedule/scenario-drops-real-absence.model';
import { RecoveryDialogLauncherService } from './recovery-dialog-launcher.service';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';

const SPEC_LOCALE = 'de-CH';

registerLocaleData(localeDe, SPEC_LOCALE);

interface OpenModalOptions {
  type: ModalType;
  message: string;
  confirmText: string;
  onConfirm: () => void;
}

describe('ScenarioActionsService', () => {
  const GROUP_ID = 'group-1';
  const scenario = { id: 'scenario-1', token: 'token-1', name: 'Plan A' } as IAnalyseScenario;
  const NO_OVERRIDES = { overrideBlock: false, overrideStale: false };

  let held: Set<string>;
  let modalService: { openModal: ReturnType<typeof vi.fn> };
  let toastShowService: { showError: ReturnType<typeof vi.fn>; showInfo: ReturnType<typeof vi.fn> };
  const keyScenario = { ...scenario, variantIds: ['variant-1', 'variant-2'] } as IAnalyseScenario;

  const coverage = (name: string, openSlots: number, copiedShiftCount = 0): IScenarioVariantCoverage => ({
    variantId: `id-${name}`,
    name,
    demandedSlots: 10,
    filledSlots: 10 - openSlots,
    openSlots,
    peakOpenSlots: openSlots,
    peakDate: openSlots > 0 ? '2026-11-09' : null,
    copiedShiftCount,
  });

  const summaryOf = (variants: IScenarioVariantCoverage[] | undefined): ScenarioSummary => ({
    token: 'token-1',
    fromDate: '2026-11-01',
    untilDate: '2026-11-30',
    agentCount: 3,
    workCount: 10,
    demandedSlots: 20,
    filledSlots: 20,
    openSlots: 0,
    shifts: [],
    openSlotReasons: [],
    variants,
  });

  let scenarioService: {
    activeScenario: () => IAnalyseScenario | null;
    acceptScenario: ReturnType<typeof vi.fn>;
    rejectScenario: ReturnType<typeof vi.fn>;
    exitScenario: ReturnType<typeof vi.fn>;
    loadScenarios: ReturnType<typeof vi.fn>;
    loadSummary: ReturnType<typeof vi.fn>;
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
        { provide: LocaleService, useValue: { getLocale: () => SPEC_LOCALE } },
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
      loadSummary: vi.fn().mockReturnValue(of(summaryOf(undefined))),
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

  describe('a stale absence cover built on the real plan (not overridable)', () => {
    const CLIENT_ID = 'client-1';
    const ABSENCE_ID = 'absence-1';

    const coverStale = (preset: Record<string, unknown>): HttpErrorResponse =>
      conflict({
        detail: 'stale cover',
        errorCode: SCENARIO_STALE_ERROR_CODE,
        changedEntryCount: 2,
        lastChangeUtc: '2026-04-20T10:00:00Z',
        acceptedScenarioNames: [],
        overridable: false,
        ...preset,
      });

    const fullPreset = {
      coverClientId: CLIENT_ID,
      coverAbsenceId: ABSENCE_ID,
      coverFromDate: '2026-04-21',
      coverUntilDate: '2026-04-23',
    };

    let launcher: RecoveryDialogLauncherService;

    const createWithLauncher = (): ScenarioActionsService => {
      const service = createService();
      launcher = TestBed.inject(RecoveryDialogLauncherService);
      vi.spyOn(launcher, 'requestOpen');
      return service;
    };

    beforeEach(() => setCompanyTimeZone('UTC'));
    afterEach(() => setCompanyTimeZone(null));

    it('offers to discard and cover again instead of accepting anyway', () => {
      // Arrange
      held.add(ROLE_ADMIN);
      scenarioService.acceptScenario.mockReturnValueOnce(throwError(() => coverStale(fullPreset)));
      const service = createWithLauncher();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(modalService.openModal).toHaveBeenCalledTimes(2);
      expect(lastModal().confirmText).toBe('scenario.accept.coverStaleRedoButton');
      expect(lastModal().message).toContain('scenario.accept.coverStaleMessage:2|');
      expect(lastModal().message).not.toContain('scenario.accept.staleMessage');
      expect(scenarioService.acceptScenario).toHaveBeenCalledTimes(1);
    });

    it('rejects the cover and opens the absence dialog with the cover preset once confirmed', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValueOnce(throwError(() => coverStale(fullPreset)));
      const service = createWithLauncher();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();
      lastModal().onConfirm();

      // Assert
      expect(scenarioService.acceptScenario).toHaveBeenCalledTimes(1);
      expect(scenarioService.rejectScenario).toHaveBeenCalledWith('scenario-1');
      expect(launcher.requestOpen).toHaveBeenCalledTimes(1);
      const preset = vi.mocked(launcher.requestOpen).mock.calls[0][0]!;
      expect(preset.clientId).toBe(CLIENT_ID);
      expect(preset.absenceId).toBe(ABSENCE_ID);
      expect(calendarDateKey(preset.date)).toBe('2026-04-21');
      expect(calendarDateKey(preset.untilDate)).toBe('2026-04-23');
    });

    it('opens the absence dialog with the days only when the cover has no unique person', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValueOnce(
        throwError(() =>
          coverStale({ coverClientId: null, coverAbsenceId: ABSENCE_ID, coverFromDate: '2026-04-21', coverUntilDate: null }),
        ),
      );
      const service = createWithLauncher();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();
      lastModal().onConfirm();

      // Assert
      const preset = vi.mocked(launcher.requestOpen).mock.calls[0][0]!;
      expect(preset.clientId).toBeUndefined();
      expect(preset.absenceId).toBeUndefined();
      expect(calendarDateKey(preset.date)).toBe('2026-04-21');
      expect(preset.untilDate).toBeUndefined();
    });

    it('does not open the absence dialog when the reject fails', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValueOnce(throwError(() => coverStale(fullPreset)));
      scenarioService.rejectScenario.mockReturnValueOnce(
        throwError(() => conflict({ errorCode: SCENARIO_NOT_ACTIVE_ERROR_CODE })),
      );
      const service = createWithLauncher();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();
      lastModal().onConfirm();

      // Assert
      expect(launcher.requestOpen).not.toHaveBeenCalled();
      expect(toastShowService.showError).toHaveBeenCalledWith('scenario.notActive');
    });
  });

  describe('a stale warning that comes back after it was acknowledged', () => {
    it('shows the stale text as an error and never offers the compliance override', () => {
      // Arrange
      held.add(ROLE_ADMIN);
      const stale = conflict({
        detail: 'stale',
        errorCode: SCENARIO_STALE_ERROR_CODE,
        changedEntryCount: 1,
        lastChangeUtc: '2026-04-20T10:00:00Z',
        acceptedScenarioNames: [],
        overridable: true,
      });
      scenarioService.acceptScenario.mockReturnValue(throwError(() => stale));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();
      lastModal().onConfirm();

      // Assert
      expect(scenarioService.acceptScenario).toHaveBeenCalledTimes(2);
      expect(modalService.openModal).toHaveBeenCalledTimes(2);
      expect(toastShowService.showError).toHaveBeenCalledTimes(1);
      expect(toastShowService.showError.mock.calls[0][0]).toContain('scenario.accept.staleMessage');
    });
  });

  describe('an accept that would delete real absences', () => {
    const drops = (count: number, names: string[]): HttpErrorResponse =>
      conflict({
        detail: 'drops',
        errorCode: SCENARIO_DROPS_REAL_ABSENCE_ERROR_CODE,
        droppedAbsenceCount: count,
        droppedAbsences: names.map((clientName, index) => ({
          clientId: `client-${index}`,
          clientName,
          date: '2026-04-21',
          absenceId: 'absence-1',
        })),
        overridable: false,
      });

    it('names the absences and offers only to discard, never an override', () => {
      // Arrange
      held.add(ROLE_ADMIN);
      scenarioService.acceptScenario.mockReturnValueOnce(throwError(() => drops(12, ['Elsa Muster', 'Hans Beispiel'])));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(modalService.openModal).toHaveBeenCalledTimes(2);
      const modal = lastModal();
      expect(modal.confirmText).toBe('scenario.reject');
      expect(modal.message).toContain('scenario.accept.dropsAbsenceMessage:12|');
      expect(modal.message).toContain('Elsa Muster 21.04.2026');
      expect(modal.message).toContain('Hans Beispiel 21.04.2026');
      expect(modal.message).toContain('scenario.accept.dropsAbsenceMore:10');

      modal.onConfirm();
      expect(scenarioService.rejectScenario).toHaveBeenCalledWith('scenario-1');
      expect(scenarioService.acceptScenario).toHaveBeenCalledTimes(1);
    });

    it('leaves out the remainder when every absence is listed', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValueOnce(throwError(() => drops(1, ['Elsa Muster'])));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(lastModal().message).not.toContain('scenario.accept.dropsAbsenceMore');
    });

    it('is not taken for the compliance block after a supervisor override', () => {
      // Arrange
      held.add(ROLE_AUTHORISED);
      scenarioService.acceptScenario
        .mockReturnValueOnce(throwError(() => conflict({ detail: 'blocked' })))
        .mockReturnValueOnce(throwError(() => drops(1, ['Elsa Muster'])));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();
      lastModal().onConfirm();

      // Assert
      expect(lastModal().message).toContain('scenario.accept.dropsAbsenceMessage');
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

  describe('accepting a scenario that carries keys', () => {
    beforeEach(() => {
      scenarioService.activeScenario = () => keyScenario;
    });

    it('loads the summary by scenario id and names the open slots of the keys before asking', () => {
      // Arrange
      scenarioService.loadSummary.mockReturnValue(of(summaryOf([coverage('Winter', 3), coverage('Summer', 0), coverage('Spring', 2)])));
      const service = createService();

      // Act
      service.confirmAccept();

      // Assert
      expect(scenarioService.loadSummary).toHaveBeenCalledWith('scenario-1');
      expect(modalService.openModal).toHaveBeenCalledTimes(1);
      expect(lastModal().message).toBe('scenarioVariant.accept.confirmOpenSlots:Plan A|5|Winter (3), Spring (2)');
      expect(scenarioService.acceptScenario).not.toHaveBeenCalled();
    });

    it('still accepts once the extended confirmation is confirmed', () => {
      // Arrange
      scenarioService.loadSummary.mockReturnValue(of(summaryOf([coverage('Winter', 3)])));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(scenarioService.acceptScenario).toHaveBeenCalledWith('scenario-1', NO_OVERRIDES);
    });

    it('keeps the plain confirmation text when no slot of any key is open', () => {
      // Arrange
      scenarioService.loadSummary.mockReturnValue(of(summaryOf([coverage('Winter', 0)])));
      const service = createService();

      // Act
      service.confirmAccept();

      // Assert
      expect(lastModal().message).toBe('scenario.accept.confirm:Plan A');
    });

    it('warns that the demand counts twice when a key holds copies, even with every slot filled', () => {
      // Arrange
      scenarioService.loadSummary.mockReturnValue(of(summaryOf([coverage('Winter', 0, 3), coverage('Summer', 0, 2)])));
      const service = createService();

      // Act
      service.confirmAccept();

      // Assert
      expect(lastModal().message).toBe(
        'scenario.accept.confirm:Plan A scenarioVariant.accept.copiedShifts.other:5|Winter (3), Summer (2)',
      );
    });

    it('adds the warning about copies after the open slots and names only the keys holding copies', () => {
      // Arrange
      scenarioService.loadSummary.mockReturnValue(of(summaryOf([coverage('Winter', 3, 2), coverage('Summer', 1, 0)])));
      const service = createService();

      // Act
      service.confirmAccept();

      // Assert
      expect(lastModal().message).toBe(
        'scenarioVariant.accept.confirmOpenSlots:Plan A|4|Winter (3), Summer (1) scenarioVariant.accept.copiedShifts.other:2|Winter (2)',
      );
    });

    it('warns about copies of a key nothing was planned for, and names no open slots for it', () => {
      // Arrange
      const unplanned = { ...coverage('Winter', 0, 2), demandedSlots: 0, filledSlots: 0 };
      scenarioService.loadSummary.mockReturnValue(of(summaryOf([unplanned])));
      const service = createService();

      // Act
      service.confirmAccept();

      // Assert
      expect(lastModal().message).toBe('scenario.accept.confirm:Plan A scenarioVariant.accept.copiedShifts.other:2|Winter (2)');
    });

    it('uses the singular text for one copy', () => {
      // Arrange
      scenarioService.loadSummary.mockReturnValue(of(summaryOf([coverage('Winter', 0, 1)])));
      const service = createService();

      // Act
      service.confirmAccept();

      // Assert
      expect(lastModal().message).toBe('scenario.accept.confirm:Plan A scenarioVariant.accept.copiedShifts.one:1|Winter (1)');
    });

    it('keeps the plain confirmation text when the summary carries no key coverage', () => {
      // Arrange
      scenarioService.loadSummary.mockReturnValue(of(summaryOf(undefined)));
      const service = createService();

      // Act
      service.confirmAccept();

      // Assert
      expect(lastModal().message).toBe('scenario.accept.confirm:Plan A');
    });

    it('does not block accepting when the summary cannot be loaded, and shows the generic text', () => {
      // Arrange
      scenarioService.loadSummary.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      const service = createService();

      // Act
      service.confirmAccept();

      // Assert
      expect(modalService.openModal).toHaveBeenCalledTimes(1);
      expect(lastModal().message).toBe('scenario.accept.confirm:Plan A');
      lastModal().onConfirm();
      expect(scenarioService.acceptScenario).toHaveBeenCalledWith('scenario-1', NO_OVERRIDES);
    });

    it('does not log the failure of the summary request', () => {
      // Arrange
      const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      scenarioService.loadSummary.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500, error: 'Winter key of Anna Muster' })));
      const service = createService();

      // Act
      service.confirmAccept();

      // Assert
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      log.mockRestore();
      warn.mockRestore();
    });

    it('does not load a summary for a scenario without keys', () => {
      // Arrange
      scenarioService.activeScenario = () => scenario;
      const service = createService();

      // Act
      service.confirmAccept();

      // Assert
      expect(scenarioService.loadSummary).not.toHaveBeenCalled();
      expect(lastModal().message).toBe('scenario.accept.confirm:Plan A');
    });
  });

  describe('a scenario whose key was already consumed', () => {
    const consumed = (variantNames: string[] | undefined = ['Winter', 'Spring']): HttpErrorResponse =>
      conflict({ detail: 'consumed', errorCode: SCENARIO_VARIANT_ERROR_CODES.Consumed, variantNames });

    beforeEach(() => {
      scenarioService.activeScenario = () => keyScenario;
    });

    it('names the consumed keys in a translated toast and offers to discard, never an override', () => {
      // Arrange
      held.add(ROLE_ADMIN);
      scenarioService.acceptScenario.mockReturnValue(throwError(() => consumed()));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(toastShowService.showError).toHaveBeenCalledWith('scenarioVariant.accept.consumed:Winter, Spring');
      expect(modalService.openModal).toHaveBeenCalledTimes(2);
      expect(lastModal().message).toBe('scenario.reject.confirm:Plan A');
      expect(scenarioService.acceptScenario).toHaveBeenCalledTimes(1);
    });

    it('rejects the scenario once the offered discard is confirmed', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValue(throwError(() => consumed()));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();
      lastModal().onConfirm();

      // Assert
      expect(scenarioService.rejectScenario).toHaveBeenCalledWith('scenario-1');
    });

    it('says so without names when the server sent none', () => {
      // Arrange
      scenarioService.acceptScenario.mockReturnValue(throwError(() => consumed([])));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(toastShowService.showError).toHaveBeenCalledWith('scenarioVariant.accept.consumedUnnamed');
    });

    it('is not mistaken for the compliance block that offers an override', () => {
      // Arrange
      held.add(ROLE_AUTHORISED);
      scenarioService.acceptScenario.mockReturnValue(throwError(() => consumed()));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(lastModal().message).not.toBe('consumed');
      expect(scenarioService.acceptScenario).not.toHaveBeenCalledWith('scenario-1', { overrideBlock: true, overrideStale: false });
    });
  });

  describe('accepting without the right to do so', () => {
    const forbidden = (): HttpErrorResponse => new HttpErrorResponse({ status: 403 });

    it('shows a translated toast for a 403 and offers no override and no second attempt', () => {
      // Arrange
      held.add(ROLE_ADMIN);
      scenarioService.acceptScenario.mockReturnValue(throwError(() => forbidden()));
      const service = createService();

      // Act
      service.confirmAccept();
      lastModal().onConfirm();

      // Assert
      expect(toastShowService.showError).toHaveBeenCalledWith('scenarioVariant.accept.forbidden');
      expect(modalService.openModal).toHaveBeenCalledTimes(1);
      expect(scenarioService.acceptScenario).toHaveBeenCalledTimes(1);
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

    it('lets a planner accept a scenario without keys', () => {
      held.add(PERMISSIONS.CanEditSchedule);
      expect(createService().canAccept()).toBe(true);
    });

    it('does not let a planner accept a scenario that carries keys, but lets them reject it', () => {
      held.add(PERMISSIONS.CanEditSchedule);
      scenarioService.activeScenario = () => keyScenario;
      const service = createService();

      expect(service.canAccept()).toBe(false);
      expect(service.canDecide()).toBe(true);
    });

    it('lets a user with the schedule and the shift edit right accept a scenario that carries keys', () => {
      held.add(PERMISSIONS.CanEditSchedule);
      held.add(PERMISSIONS.CanEditShifts);
      scenarioService.activeScenario = () => keyScenario;
      expect(createService().canAccept()).toBe(true);
    });

    it('lets an admin accept a scenario that carries keys', () => {
      held.add(ROLE_ADMIN);
      scenarioService.activeScenario = () => keyScenario;
      expect(createService().canAccept()).toBe(true);
    });

    it('treats a scenario with an empty key list like one without keys', () => {
      held.add(PERMISSIONS.CanEditSchedule);
      scenarioService.activeScenario = () => ({ ...scenario, variantIds: [] }) as IAnalyseScenario;
      expect(createService().canAccept()).toBe(true);
    });

    it('does not let a user without the schedule edit right accept anything', () => {
      held.add(PERMISSIONS.CanViewSchedule);
      expect(createService().canAccept()).toBe(false);
    });  });
});
