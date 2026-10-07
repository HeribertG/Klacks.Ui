// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { TestBed } from '@angular/core/testing';
import { EmbeddedViewRef, signal, TemplateRef } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { RecoveryDialogComponent } from './recovery-dialog.component';
import {
  DataRecoveryService,
  ICoverAbsenceOutcome,
  ICoveredSlot,
} from 'src/app/infrastructure/api/schedule/data-recovery.service';
import { ReplacementRequestOutcome } from 'src/app/domain/enums/replacement-request-outcome.enum';
import { IReplacementCandidate } from 'src/app/domain/interfaces/replacement-candidate.interface';
import { IReplacementRequest } from 'src/app/domain/interfaces/replacement-request.interface';
import { ReplacementRequestSource } from 'src/app/domain/enums/replacement-request-source.enum';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { RecoveryDialogLauncherService } from '../../services/recovery-dialog-launcher.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { companyToday, formatDateOnly } from 'src/app/shared/helpers/calendar-date.helper';
import { addDays } from 'src/app/shared/helpers/date.helper';

const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../assets/i18n');
const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'];
const COVERING_TIERS = [0, 1, 2, 3, 5, 6];

const GROUP_ID = 'group-1';
const SICK_ABSENCE_ID = 'absence-sick';
const REVIEW_KEYS = [
  'outcome.accept',
  'outcome.decline',
  'outcome.notReached',
  'outcome.groupLabel',
  'outcomeState.Proposed',
  'outcomeState.Requested',
  'outcomeState.Accepted',
  'outcomeState.Declined',
  'outcomeState.NotReached',
  'outcomeSaveFailed',
  'noPhone',
  'callPhone',
  'alternatives',
  'hideAlternatives',
  'alternativesTitle',
  'alternativesLoading',
  'alternativesFailed',
  'noAlternatives',
  'onCall',
  'conflicts',
  'alternativeOutcomeHint',
  'slotTime',
];

const outcome: ICoverAbsenceOutcome = {
  scenarioId: 'scenario-1',
  token: 'token-1',
  scenarioName: 'Absence cover 06.10.',
  covered: [],
  uncovered: [],
  complianceWarnings: [],
  highestTier: 0,
};

describe('RecoveryDialogComponent', () => {
  let component: RecoveryDialogComponent;
  let modalOpen: ReturnType<typeof vi.fn>;
  let modalClose: ReturnType<typeof vi.fn>;
  let coverAbsence: ReturnType<typeof vi.fn>;
  let selectScenario: ReturnType<typeof vi.fn>;
  let readDatas: ReturnType<typeof vi.fn>;
  let scenarios: ReturnType<typeof signal<IAnalyseScenario[]>>;
  let schedule: { clients: unknown[]; periodStartDate: Date | null; periodEndDate: Date | null; workFilter: { selectedGroup: string }; readDatas: ReturnType<typeof vi.fn> };
  let launcher: RecoveryDialogLauncherService;
  let isSupervisor: boolean;
  let updateRequestOutcome: ReturnType<typeof vi.fn>;
  let getCandidates: ReturnType<typeof vi.fn>;
  let recordRequest: ReturnType<typeof vi.fn>;
  let getRequests: ReturnType<typeof vi.fn>;
  let showError: ReturnType<typeof vi.fn>;
  let host: HTMLDivElement;
  let renderedView: EmbeddedViewRef<unknown> | null;

  const formModel = (): any => (component as any).formModel();

  beforeEach(async () => {
    modalClose = vi.fn();
    host = document.createElement('div');
    renderedView = null;
    modalOpen = vi.fn().mockImplementation((template: TemplateRef<unknown>) => {
      renderedView?.destroy();
      host.replaceChildren();
      renderedView = template.createEmbeddedView({});
      renderedView.detectChanges();
      host.append(...(renderedView.rootNodes as Node[]));
      return { close: modalClose };
    });
    updateRequestOutcome = vi.fn();
    getCandidates = vi.fn();
    recordRequest = vi.fn();
    getRequests = vi.fn().mockReturnValue(of([]));
    showError = vi.fn();
    coverAbsence = vi.fn().mockReturnValue(of(outcome));
    selectScenario = vi.fn();
    readDatas = vi.fn();
    scenarios = signal<IAnalyseScenario[]>([]);
    isSupervisor = true;
    const today = companyToday();
    schedule = {
      clients: [{ id: 'client-1', firstName: 'Anna', name: 'Muster' }],
      periodStartDate: addDays(today, -3),
      periodEndDate: addDays(today, 3),
      workFilter: { selectedGroup: GROUP_ID },
      readDatas,
    };

    await TestBed.configureTestingModule({
      imports: [RecoveryDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: NgbModal, useValue: { open: modalOpen } },
        {
          provide: DataRecoveryService,
          useValue: { coverAbsence, updateRequestOutcome, getCandidates, recordRequest, getRequests },
        },
        { provide: AnalyseScenarioService, useValue: { scenarios, selectScenario } },
        { provide: DataManagementScheduleService, useValue: schedule },
        { provide: ToastShowService, useValue: { showError } },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: () => true, hasAnyPermission: () => isSupervisor },
        },
      ],
    })
      .overrideComponent(RecoveryDialogComponent, {
        set: {
          providers: [
            {
              provide: AbsenceLookupService,
              useValue: {
                loadIfNeeded: vi.fn().mockResolvedValue(undefined),
                absences: () => [{ id: SICK_ABSENCE_ID, name: { en: 'Sick' } }],
              },
            },
          ],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(RecoveryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    launcher = TestBed.inject(RecoveryDialogLauncherService);
  });

  it('pre-fills employee and day from a preset and opens the modal', async () => {
    await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6) });

    expect(modalOpen).toHaveBeenCalledTimes(1);
    expect(formModel()).toMatchObject({
      selectedClientId: 'client-1',
      selectedDate: '2026-10-06',
      selectedUntilDate: '',
      notifyEscalationRoster: false,
    });
  });

  it('defaults the day to today while today lies inside the visible period', async () => {
    await component.open();

    expect(formModel().selectedDate).toBe(formatDateOnly(companyToday()));
    expect(formModel().selectedClientId).toBe('');
  });

  it('falls back to the period start when today lies outside the visible period', async () => {
    schedule.periodStartDate = new Date(2024, 0, 1);
    schedule.periodEndDate = new Date(2024, 0, 31);

    await component.open();

    expect(formModel().selectedDate).toBe('2024-01-01');
  });

  it('opens on a launcher request with the request preset', async () => {
    launcher.requestOpen({ clientId: 'client-1', date: new Date(2026, 9, 7), untilDate: new Date(2026, 9, 8) });
    await Promise.resolve();
    await Promise.resolve();

    expect(modalOpen).toHaveBeenCalledTimes(1);
    expect(formModel()).toMatchObject({
      selectedClientId: 'client-1',
      selectedDate: '2026-10-07',
      selectedUntilDate: '2026-10-08',
    });
  });

  it('closes a still open instance before opening again, so modals never stack', async () => {
    await component.open({ clientId: 'client-1' });
    await component.open({ clientId: 'client-1' });

    expect(modalClose).toHaveBeenCalledTimes(1);
    expect(modalOpen).toHaveBeenCalledTimes(2);
  });

  it('sends the roster flag off by default and selects the created scenario', async () => {
    await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6) });
    (component as any).formModel.update((model: any) => ({ ...model, selectedAbsenceId: SICK_ABSENCE_ID }));

    await component.onSubmit();

    expect(coverAbsence).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        date: '2026-10-06',
        groupId: GROUP_ID,
        absenceId: SICK_ABSENCE_ID,
        notifyEscalationRoster: false,
      }),
    );
    expect(selectScenario).toHaveBeenCalledWith(expect.objectContaining({ id: 'scenario-1', token: 'token-1' }));
    expect(scenarios().map((s) => s.id)).toEqual(['scenario-1']);
    expect(readDatas).toHaveBeenCalled();
    expect((component as any).result()).toEqual(outcome);
  });

  it('passes the roster flag through when the planner ticks it', async () => {
    await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6) });
    (component as any).formModel.update((model: any) => ({
      ...model,
      selectedAbsenceId: SICK_ABSENCE_ID,
      notifyEscalationRoster: true,
    }));

    await component.onSubmit();

    expect(coverAbsence).toHaveBeenCalledWith(expect.objectContaining({ notifyEscalationRoster: true }));
  });

  it('remembers the absence type of the previous run for the next sick call', async () => {
    await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6) });
    (component as any).formModel.update((model: any) => ({ ...model, selectedAbsenceId: SICK_ABSENCE_ID }));
    await component.onSubmit();

    await component.open({ clientId: 'client-2' });

    expect(formModel().selectedAbsenceId).toBe(SICK_ABSENCE_ID);
    expect(formModel().selectedClientId).toBe('client-2');
  });

  it('offers the rule override to a supervisor only', () => {
    expect((component as any).canOverride()).toBe(true);

    isSupervisor = false;
    const planner = TestBed.createComponent(RecoveryDialogComponent).componentInstance;

    expect((planner as any).canOverride()).toBe(false);
  });

  it('maps every engine tier that can cover a slot to its own label key, on-call included', () => {
    const tiers = [0, 1, 2, 3, 5, 6];

    const keys = tiers.map((tier) => (component as any).tierKey(tier));

    expect(keys).toEqual(tiers.map((tier) => `recovery.dialog.tier.${tier}`));
  });

  it('has a non-empty label for every covering tier in all four core catalogues', () => {
    for (const language of CORE_LANGUAGES) {
      const catalogue = JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8')) as Record<string, string>;
      for (const tier of COVERING_TIERS) {
        expect(catalogue[`recovery.dialog.tier.${tier}`], `${language} tier ${tier}`).toBeTruthy();
      }
      expect(catalogue['schedule.error-list.on-call-overlap'], `${language} on-call-overlap`).toContain('{{workTimeRange}}');
      expect(catalogue['schedule.error-list.on-call-overlap'], `${language} on-call-overlap`).toContain('{{onCallTimeRange}}');
      for (const key of REVIEW_KEYS) {
        expect(catalogue[`recovery.dialog.${key}`], `${language} ${key}`).toBeTruthy();
      }
    }
  });

  it('has a response state label for every replacement-request outcome', () => {
    const keys = Object.values(ReplacementRequestOutcome).map((value) => (component as any).outcomeStateKey(value));

    expect(keys).toEqual(Object.values(ReplacementRequestOutcome).map((value) => `recovery.dialog.outcomeState.${value}`));
    expect((component as any).outcomeStateKey(null)).toBe('recovery.dialog.outcomeState.Proposed');
  });

  describe('review step: responses and alternatives', () => {
    const coveredSlot: ICoveredSlot = {
      shiftId: 'shift-1',
      date: '2026-10-06',
      replacementClientId: 'client-9',
      replacementName: 'Berta Beispiel',
      tier: 0,
      workId: 'work-1',
      startTime: '06:00:00',
      endTime: '14:00:00',
      requestId: 'request-1',
      phone: '+41 79 123 45 67',
      outcome: ReplacementRequestOutcome.Proposed,
    };

    const candidate = (clientId: string, name: string, extra: Partial<IReplacementCandidate> = {}): IReplacementCandidate => ({
      clientId,
      name,
      isPreferred: false,
      softConflicts: [],
      targetHoursDeficit: 0,
      isOnCall: false,
      phone: null,
      ...extra,
    });

    const settle = async (): Promise<void> => {
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }
      renderedView?.detectChanges();
    };

    const query = (selector: string): HTMLElement | null => host.querySelector(selector);
    const outcomeButton = (scope: string, value: ReplacementRequestOutcome): HTMLButtonElement =>
      host.querySelector(`${scope} app-recovery-outcome-buttons button[data-outcome="${value}"]`) as HTMLButtonElement;

    const submitWith = async (covered: ICoveredSlot[]): Promise<void> => {
      coverAbsence.mockReturnValue(of({ ...outcome, covered }));
      await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6) });
      (component as any).formModel.update((model: any) => ({ ...model, selectedAbsenceId: SICK_ABSENCE_ID }));
      await component.onSubmit();
      renderedView?.detectChanges();
    };

    it('renders the slot time without seconds and the phone as a tel link without spaces', async () => {
      // Arrange & Act
      await submitWith([coveredSlot]);

      // Assert
      const link = query('[data-slot] a.recovery-phone') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('tel:+41791234567');
      expect(link.textContent?.trim()).toBe('+41 79 123 45 67');
      expect(query('[data-slot] .recovery-no-phone')).toBeNull();
      expect((component as any).displayTime(coveredSlot.startTime)).toBe('06:00');
    });

    it('shows a muted hint instead of a link when the stand-in has no phone', async () => {
      await submitWith([{ ...coveredSlot, phone: null }]);

      expect(query('[data-slot] a.recovery-phone')).toBeNull();
      expect(query('[data-slot] .recovery-no-phone')).not.toBeNull();
    });

    it('puts the clicked response and shows the state the server stored', async () => {
      // Arrange
      await submitWith([coveredSlot]);
      updateRequestOutcome.mockReturnValue(of({ id: 'request-1', outcome: ReplacementRequestOutcome.Declined }));

      // Act
      outcomeButton('[data-slot]', ReplacementRequestOutcome.Accepted).click();
      await settle();

      // Assert
      expect(updateRequestOutcome).toHaveBeenCalledWith('request-1', ReplacementRequestOutcome.Accepted);
      expect(outcomeButton('[data-slot]', ReplacementRequestOutcome.Declined).getAttribute('aria-pressed')).toBe('true');
      expect(outcomeButton('[data-slot]', ReplacementRequestOutcome.Accepted).getAttribute('aria-pressed')).toBe('false');
      expect(query('[data-slot] .recovery-outcome-state')?.textContent?.trim()).toBe('recovery.dialog.outcomeState.Declined');
    });

    it('disables the response buttons when no request row was stored', async () => {
      await submitWith([{ ...coveredSlot, requestId: null }]);

      for (const value of [
        ReplacementRequestOutcome.Accepted,
        ReplacementRequestOutcome.Declined,
        ReplacementRequestOutcome.NotReached,
      ]) {
        expect(outcomeButton('[data-slot]', value).disabled).toBe(true);
      }
      await (component as any).onSlotOutcome({ ...coveredSlot, requestId: null }, ReplacementRequestOutcome.Accepted);
      expect(updateRequestOutcome).not.toHaveBeenCalled();
    });

    it('shows a translated error when the response cannot be saved', async () => {
      await submitWith([coveredSlot]);
      updateRequestOutcome.mockReturnValue(throwError(() => new Error('boom')));

      await (component as any).onSlotOutcome(coveredSlot, ReplacementRequestOutcome.Accepted);

      expect(showError).toHaveBeenCalledWith('recovery.dialog.outcomeSaveFailed');
      expect((component as any).slotOutcome(coveredSlot)).toBe(ReplacementRequestOutcome.Proposed);
    });

    it('loads alternatives without the proposed person and records a contact attempt with the submitted context', async () => {
      // Arrange
      await submitWith([coveredSlot]);
      getCandidates.mockReturnValue(
        of({
          eligible: [
            candidate('client-9', 'Berta Beispiel'),
            candidate('client-7', 'Carla Cover', {
              isOnCall: true,
              phone: '079 000 00 00',
              softConflicts: [{ type: 'warning', clientId: 'client-7', clientName: 'Carla', date: '2026-10-06', comment: 'x', commentParams: {} }],
            }),
          ],
          excluded: [],
        }),
      );
      recordRequest.mockReturnValue(of({ id: 'request-7', outcome: ReplacementRequestOutcome.NotReached }));
      schedule.workFilter.selectedGroup = 'group-other';
      (component as any).formModel.update((model: any) => ({ ...model, selectedClientId: 'client-other' }));

      // Act
      (query('.recovery-alternatives-toggle') as HTMLButtonElement).click();
      await settle();

      // Assert
      expect(getCandidates).toHaveBeenCalledWith(
        expect.objectContaining({
          shiftId: 'shift-1',
          date: '2026-10-06',
          startTime: '06:00:00',
          endTime: '14:00:00',
          groupId: GROUP_ID,
          analyseToken: 'token-1',
        }),
      );
      const rendered = Array.from(host.querySelectorAll('[data-candidate]')).map((el) => el.getAttribute('data-candidate'));
      expect(rendered).toEqual(['client-7']);
      expect(query('[data-candidate="client-7"] .text-bg-info')).not.toBeNull();
      expect(query('[data-candidate="client-7"] .text-bg-warning')).not.toBeNull();
      expect((query('[data-candidate="client-7"] a.recovery-phone') as HTMLAnchorElement).getAttribute('href')).toBe('tel:0790000000');

      // Act
      outcomeButton('[data-candidate="client-7"]', ReplacementRequestOutcome.NotReached).click();
      await settle();

      // Assert
      expect(recordRequest).toHaveBeenCalledWith({
        absentClientId: 'client-1',
        candidateClientId: 'client-7',
        shiftId: 'shift-1',
        date: '2026-10-06',
        startTime: '06:00:00',
        endTime: '14:00:00',
        groupId: GROUP_ID,
        absenceId: SICK_ABSENCE_ID,
        analyseToken: 'token-1',
        outcome: ReplacementRequestOutcome.NotReached,
      });
      expect(updateRequestOutcome).not.toHaveBeenCalled();
      expect(
        outcomeButton('[data-candidate="client-7"]', ReplacementRequestOutcome.NotReached).getAttribute('aria-pressed'),
      ).toBe('true');
    });

    it('shows the failed state when the alternatives cannot be loaded', async () => {
      await submitWith([coveredSlot]);
      getCandidates.mockReturnValue(throwError(() => new Error('boom')));

      (query('.recovery-alternatives-toggle') as HTMLButtonElement).click();
      await settle();

      expect(query('.recovery-alternatives-failed')).not.toBeNull();
    });

    it('shows the empty state when only the proposed person is eligible', async () => {
      await submitWith([coveredSlot]);
      getCandidates.mockReturnValue(of({ eligible: [candidate('client-9', 'Berta Beispiel')], excluded: [] }));

      (query('.recovery-alternatives-toggle') as HTMLButtonElement).click();
      await settle();

      expect(query('.recovery-alternatives-empty')).not.toBeNull();
    });

    describe('stored request rows', () => {
      const storedRow = (candidateClientId: string, extra: Partial<IReplacementRequest> = {}): IReplacementRequest => ({
        id: `stored-${candidateClientId}`,
        absentClientId: 'client-1',
        candidateClientId,
        shiftId: 'shift-1',
        date: '2026-10-06',
        startTime: '06:00:00',
        endTime: '14:00:00',
        groupId: GROUP_ID,
        absenceId: SICK_ABSENCE_ID,
        source: ReplacementRequestSource.PlannerDialog,
        outcome: ReplacementRequestOutcome.Declined,
        reportedAtUtc: '2026-10-06T04:00:00Z',
        shiftStartUtc: '2026-10-06T04:00:00Z',
        outcomeAtUtc: '2026-10-06T04:05:00Z',
        outcomeByUserId: null,
        analyseToken: 'token-1',
        workChangeId: null,
        appliedAtUtc: null,
        isShortNotice: true,
        ...extra,
      });

      const secondSlot: ICoveredSlot = {
        ...coveredSlot,
        shiftId: 'shift-2',
        requestId: 'request-2',
      };

      const toggle = async (index = 0): Promise<void> => {
        (host.querySelectorAll('.recovery-alternatives-toggle')[index] as HTMLButtonElement).click();
        await settle();
      };

      beforeEach(() => {
        getCandidates.mockReturnValue(of({ eligible: [candidate('client-7', 'Carla Cover')], excluded: [] }));
      });

      it('loads the stored rows once per result with the scenario token and the absent employee', async () => {
        // Arrange
        await submitWith([coveredSlot, secondSlot]);

        // Act
        await toggle(0);
        await toggle(1);
        await toggle(0);
        await toggle(0);

        // Assert
        expect(getRequests).toHaveBeenCalledTimes(1);
        expect(getRequests).toHaveBeenCalledWith({ analyseToken: 'token-1', absentClientId: 'client-1' });
      });

      it('reloads the stored rows after going back to the form and submitting again', async () => {
        // Arrange
        await submitWith([coveredSlot]);
        await toggle();
        (component as any).onBackToForm();
        await component.onSubmit();
        renderedView?.detectChanges();
        getRequests.mockReturnValue(of([storedRow('client-7')]));

        // Act
        await toggle();

        // Assert
        expect(getRequests).toHaveBeenCalledTimes(2);
        expect(
          outcomeButton('[data-candidate="client-7"]', ReplacementRequestOutcome.Declined).getAttribute('aria-pressed'),
        ).toBe('true');
      });

      it('prefills the stored outcomes of the alternatives and of the proposed stand-in', async () => {
        // Arrange
        getRequests.mockReturnValue(
          of([
            storedRow('client-7', { outcome: ReplacementRequestOutcome.NotReached }),
            storedRow('client-9', { id: 'request-1', outcome: ReplacementRequestOutcome.Accepted }),
            storedRow('client-8', { shiftId: 'shift-other', outcome: ReplacementRequestOutcome.Accepted }),
          ]),
        );
        await submitWith([coveredSlot]);

        // Act
        await toggle();

        // Assert
        expect(
          outcomeButton('[data-candidate="client-7"]', ReplacementRequestOutcome.NotReached).getAttribute('aria-pressed'),
        ).toBe('true');
        expect(query('[data-candidate="client-7"] .recovery-outcome-state')?.textContent?.trim()).toBe(
          'recovery.dialog.outcomeState.NotReached',
        );
        expect(outcomeButton('[data-slot]', ReplacementRequestOutcome.Accepted).getAttribute('aria-pressed')).toBe('true');
        expect(Object.keys((component as any).storedRequests())).toHaveLength(2);
      });

      it('keeps the most recent stored response when a candidate was contacted several times', async () => {
        getRequests.mockReturnValue(
          of([
            storedRow('client-7', { id: 'old', outcome: ReplacementRequestOutcome.NotReached, outcomeAtUtc: '2026-10-06T04:01:00Z' }),
            storedRow('client-7', { id: 'new', outcome: ReplacementRequestOutcome.Declined, outcomeAtUtc: '2026-10-06T04:09:00Z' }),
          ]),
        );
        await submitWith([coveredSlot]);

        await toggle();

        expect(
          outcomeButton('[data-candidate="client-7"]', ReplacementRequestOutcome.Declined).getAttribute('aria-pressed'),
        ).toBe('true');
      });

      it('does not overwrite a response the planner recorded after the load started', async () => {
        // Arrange
        const pending = new Subject<IReplacementRequest[]>();
        getRequests.mockReturnValue(pending);
        recordRequest.mockReturnValue(of({ id: 'request-7', outcome: ReplacementRequestOutcome.Accepted }));
        updateRequestOutcome.mockReturnValue(of({ id: 'request-1', outcome: ReplacementRequestOutcome.Declined }));
        await submitWith([coveredSlot]);
        await toggle();

        // Act
        outcomeButton('[data-candidate="client-7"]', ReplacementRequestOutcome.Accepted).click();
        outcomeButton('[data-slot]', ReplacementRequestOutcome.Declined).click();
        await settle();
        pending.next([
          storedRow('client-7', { outcome: ReplacementRequestOutcome.NotReached }),
          storedRow('client-9', { id: 'request-1', outcome: ReplacementRequestOutcome.Accepted }),
        ]);
        pending.complete();
        await settle();

        // Assert
        expect(
          outcomeButton('[data-candidate="client-7"]', ReplacementRequestOutcome.Accepted).getAttribute('aria-pressed'),
        ).toBe('true');
        expect(
          outcomeButton('[data-candidate="client-7"]', ReplacementRequestOutcome.NotReached).getAttribute('aria-pressed'),
        ).toBe('false');
        expect(outcomeButton('[data-slot]', ReplacementRequestOutcome.Declined).getAttribute('aria-pressed')).toBe('true');
      });

      it('keeps the alternatives usable when the stored rows cannot be loaded', async () => {
        // Arrange
        getRequests.mockReturnValue(throwError(() => new Error('boom')));
        recordRequest.mockReturnValue(of({ id: 'request-7', outcome: ReplacementRequestOutcome.NotReached }));
        await submitWith([coveredSlot]);

        // Act
        await toggle();

        // Assert
        expect(query('.recovery-alternatives-failed')).toBeNull();
        const button = outcomeButton('[data-candidate="client-7"]', ReplacementRequestOutcome.NotReached);
        expect(button.disabled).toBe(false);
        expect(button.getAttribute('aria-pressed')).toBe('false');
        expect(showError).not.toHaveBeenCalled();

        button.click();
        await settle();

        expect(recordRequest).toHaveBeenCalledTimes(1);
        expect(button.getAttribute('aria-pressed')).toBe('true');
      });

      it('renders the buttons of a row already applied to the real plan disabled', async () => {
        // Arrange
        getRequests.mockReturnValue(
          of([
            storedRow('client-7', { outcome: ReplacementRequestOutcome.Accepted, appliedAtUtc: '2026-10-06T05:00:00Z' }),
          ]),
        );
        await submitWith([coveredSlot]);

        // Act
        await toggle();

        // Assert
        for (const value of [
          ReplacementRequestOutcome.Accepted,
          ReplacementRequestOutcome.Declined,
          ReplacementRequestOutcome.NotReached,
        ]) {
          expect(outcomeButton('[data-candidate="client-7"]', value).disabled).toBe(true);
          expect(outcomeButton('[data-slot]', value).disabled).toBe(false);
        }
      });
    });

    it('forgets responses and alternatives when going back to the form', async () => {
      await submitWith([coveredSlot]);
      updateRequestOutcome.mockReturnValue(of({ id: 'request-1', outcome: ReplacementRequestOutcome.Accepted }));
      await (component as any).onSlotOutcome(coveredSlot, ReplacementRequestOutcome.Accepted);

      (component as any).onBackToForm();

      expect((component as any).slotOutcomes()).toEqual({});
      expect((component as any).alternatives()).toEqual({});
    });
  });

  it('refuses to submit while the end lies before the start', async () => {
    await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6), untilDate: new Date(2026, 9, 5) });
    (component as any).formModel.update((model: any) => ({ ...model, selectedAbsenceId: SICK_ABSENCE_ID }));

    await component.onSubmit();

    expect(coverAbsence).not.toHaveBeenCalled();
  });
});
