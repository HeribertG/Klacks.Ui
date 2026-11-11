// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'fs';
import { ReplacementRequestKind } from 'src/app/domain/enums/replacement-request-kind.enum';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { TestBed } from '@angular/core/testing';
import { EmbeddedViewRef, signal, TemplateRef } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RecoveryDialogComponent } from './recovery-dialog.component';
import { DataRecoveryService } from 'src/app/infrastructure/api/schedule/data-recovery.service';
import { ICoverAbsenceOutcome } from 'src/app/domain/models/schedule/cover-absence-outcome.interface';
import { ICoveredSlot } from 'src/app/domain/models/schedule/covered-slot.interface';
import { ICoverRelocation } from 'src/app/domain/models/schedule/cover-relocation.interface';
import { LOCALE_PROVIDER } from 'src/app/domain/interfaces/locale-provider.interface';
import { formatCalendarDate } from 'src/app/domain/helpers/locale-date-format.helper';
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
import { companyToday, formatDateOnly } from 'src/app/domain/helpers/calendar-date.helper';
import { addDays } from 'src/app/domain/helpers/date.helper';
import { APP_PORT_BINDINGS } from 'src/app/app.port-bindings';

const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../assets/i18n');
const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'];
const COVERING_TIERS = [0, 1, 2, 3, 5, 6];

const GROUP_ID = 'group-1';
const SICK_ABSENCE_ID = 'absence-sick';
const REVIEW_KEYS = [
  'rhythmFits',
  'rhythmBreaks',
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
  'borrowed',
  'contractDayOff',
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
  let openCreatedScenario: ReturnType<typeof vi.fn>;
  let activeToken: ReturnType<typeof signal<string | null>>;
  let readDatas: ReturnType<typeof vi.fn>;
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
    openCreatedScenario = vi.fn().mockResolvedValue(true);
    activeToken = signal<string | null>(null);
    readDatas = vi.fn();
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
        ...APP_PORT_BINDINGS,
        { provide: NgbModal, useValue: { open: modalOpen } },
        {
          provide: DataRecoveryService,
          useValue: { coverAbsence, updateRequestOutcome, getCandidates, recordRequest, getRequests },
        },
        { provide: AnalyseScenarioService, useValue: { openCreatedScenario, activeToken } },
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

  it('explains a container held after a failed recalculation in its own words', () => {
    const reasonKey = (component as unknown as { uncoveredReasonKey: (reason: string) => string }).uncoveredReasonKey;

    expect(reasonKey.call(component, 'recalculation failed')).toBe('recovery.dialog.reason.recalculationFailed');
    expect(reasonKey.call(component, 'locked')).toBe('recovery.dialog.reason.locked');
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

  it('shows the preset day in the datepicker and writes a picked day back as a calendar date', async () => {
    await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6) });

    expect((component as any).selectedDateStruct()).toEqual({ year: 2026, month: 10, day: 6 });

    (component as any).onDateChange({ year: 2026, month: 10, day: 9 });

    expect(formModel().selectedDate).toBe('2026-10-09');
  });

  it('clears the until day when the datepicker is emptied', async () => {
    await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6), untilDate: new Date(2026, 9, 8) });
    expect((component as any).selectedUntilDateStruct()).toEqual({ year: 2026, month: 10, day: 8 });

    (component as any).onUntilDateChange(null);

    expect(formModel().selectedUntilDate).toBe('');
    expect((component as any).selectedUntilDateStruct()).toBeNull();
  });

  it('renders the calendar toggles as labelled buttons', async () => {
    await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6) });

    const toggles = host.querySelectorAll('.recovery-calendar-toggle');

    expect(toggles.length).toBe(2);
    toggles.forEach((toggle) => {
      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle.getAttribute('type')).toBe('button');
      expect(toggle.getAttribute('aria-label')).toBeTruthy();
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
    expect(openCreatedScenario).toHaveBeenCalledWith('scenario-1');
    expect(readDatas).toHaveBeenCalled();
    expect((component as any).result()).toEqual(outcome);
  });

  it('builds the cover on the real plan when no scenario is active', async () => {
    await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6) });
    (component as any).formModel.update((model: any) => ({ ...model, selectedAbsenceId: SICK_ABSENCE_ID }));

    await component.onSubmit();

    expect(coverAbsence.mock.calls[0][0].analyseToken).toBeUndefined();
  });

  it('builds the cover on the active scenario by sending its token', async () => {
    activeToken.set('source-token');
    await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6) });
    (component as any).formModel.update((model: any) => ({ ...model, selectedAbsenceId: SICK_ABSENCE_ID }));

    await component.onSubmit();

    expect(coverAbsence).toHaveBeenCalledWith(expect.objectContaining({ analyseToken: 'source-token' }));
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

  it('maps the rhythm change of the replacements to kept, improved or broken, and hides it when not reported', () => {
    expect((component as any).harmonyKey(0)).toBe('recovery.dialog.harmony.kept');
    expect((component as any).harmonyKey(-2)).toBe('recovery.dialog.harmony.improved');
    expect((component as any).harmonyKey(3)).toBe('recovery.dialog.harmony.broken');
    expect((component as any).harmonyKey(null)).toBeNull();
    expect((component as any).harmonyKey(undefined)).toBeNull();
  });

  it('has a rhythm label in all four core catalogues', () => {
    for (const language of CORE_LANGUAGES) {
      const catalogue = JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8')) as Record<string, string>;
      for (const key of ['kept', 'improved', 'broken']) {
        expect(catalogue[`recovery.dialog.harmony.${key}`], `${language} harmony ${key}`).toBeTruthy();
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
      levelShortfall: 0,
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

    describe('swap chain moves', () => {
      const firstMove: ICoverRelocation = {
        shiftId: 'shift-7',
        date: '2026-10-06',
        fromClientId: 'client-9',
        fromName: 'Berta Beispiel',
        toClientId: 'client-7',
        toName: 'Carla Cover',
        startTime: '14:00:00',
        endTime: '22:00:00',
        tier: 1,
      };
      const secondMove: ICoverRelocation = {
        shiftId: 'shift-8',
        date: '2026-10-08',
        fromClientId: 'client-7',
        fromName: 'Carla Cover',
        toClientId: 'client-5',
        toName: 'Dora Dienst',
        startTime: '22:00:00',
        endTime: '06:00:00',
        tier: 3,
      };

      const moveRows = (): HTMLElement[] => Array.from(host.querySelectorAll<HTMLElement>('[data-slot] .recovery-relocation'));
      const textOf = (row: HTMLElement, selector: string): string | undefined =>
        row.querySelector(selector)?.textContent?.trim();

      it('lists the moves under the slot in the delivered order, each with day, time, both people and tier', async () => {
        // Arrange
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('en', { 'recovery.dialog.slotTime': '{{start}}–{{end}}' });
        translate.use('en');
        const locale = TestBed.inject(LOCALE_PROVIDER).getLocale();

        // Act
        await submitWith([{ ...coveredSlot, tier: 1, relocations: [firstMove, secondMove] }]);

        // Assert
        const rows = moveRows();
        expect(rows.map((row) => textOf(row, '.recovery-relocation-from'))).toEqual(['Berta Beispiel', 'Carla Cover']);
        expect(rows.map((row) => textOf(row, '.recovery-relocation-to'))).toEqual(['Carla Cover', 'Dora Dienst']);
        expect(rows.map((row) => textOf(row, '.recovery-date'))).toEqual([
          formatCalendarDate('2026-10-06', locale, 'numericDate'),
          formatCalendarDate('2026-10-08', locale, 'numericDate'),
        ]);
        expect(rows.map((row) => textOf(row, '.recovery-time'))).toEqual(['14:00–22:00', '22:00–06:00']);
        expect(rows.map((row) => textOf(row, '.recovery-tier'))).toEqual(['recovery.dialog.tier.1', 'recovery.dialog.tier.3']);
        expect(textOf(rows[0], '.recovery-date')).toBe(query('[data-slot] > .recovery-covered-head .recovery-date')?.textContent?.trim());
      });

      it('puts a decorative arrow between the person who hands on and the person who takes over', async () => {
        await submitWith([{ ...coveredSlot, relocations: [firstMove] }]);

        const names = Array.from(moveRows()[0].querySelector('.recovery-relocation-names')!.children);

        expect(names.map((element) => element.className.split(' ').find((name) => name.startsWith('recovery-relocation-')))).toEqual([
          'recovery-relocation-from',
          'recovery-relocation-arrow',
          'recovery-relocation-to',
        ]);
        expect(names[1].tagName).toBe('FA-ICON');
        expect(names[1].querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      });

      it('keeps the moves of each slot under their own slot', async () => {
        const otherSlot: ICoveredSlot = { ...coveredSlot, shiftId: 'shift-2', requestId: 'request-2', relocations: [secondMove] };

        await submitWith([{ ...coveredSlot, relocations: [firstMove] }, otherSlot]);

        const slots = Array.from(host.querySelectorAll<HTMLElement>('[data-slot]'));
        expect(slots.map((slot) => Array.from(slot.querySelectorAll('.recovery-relocation-to')).map((el) => el.textContent?.trim()))).toEqual([
          ['Carla Cover'],
          ['Dora Dienst'],
        ]);
      });

      it.each([
        ['an absent list', undefined],
        ['a null list', null],
        ['an empty list', []],
      ])('shows no move rows for a direct cover with %s', async (_label, relocations) => {
        await submitWith([{ ...coveredSlot, relocations }]);

        expect(query('[data-slot]')).not.toBeNull();
        expect(query('.recovery-relocations')).toBeNull();
        expect(moveRows()).toEqual([]);
      });

      it('drops the moves of the former stand-in once an accepted alternative took the slot', async () => {
        // Arrange
        await submitWith([{ ...coveredSlot, tier: 1, relocations: [firstMove] }]);
        getCandidates.mockReturnValue(of({ eligible: [candidate('client-4', 'Tanja Moser')], excluded: [] }));
        recordRequest.mockReturnValue(
          of({ id: 'request-4', outcome: ReplacementRequestOutcome.Accepted, isScenarioReplacement: true }),
        );
        (query('.recovery-alternatives-toggle') as HTMLButtonElement).click();
        await settle();
        expect(moveRows()).toHaveLength(1);

        // Act
        outcomeButton('[data-candidate="client-4"]', ReplacementRequestOutcome.Accepted).click();
        await settle();

        // Assert
        expect(query('[data-slot] > .recovery-covered-head .recovery-name')?.textContent?.trim()).toBe('Tanja Moser');
        expect(moveRows()).toEqual([]);
      });
    });

    it('puts the clicked response and shows the state the server stored', async () => {
      // Arrange
      await submitWith([coveredSlot]);
      updateRequestOutcome.mockReturnValue(of({ id: 'request-1', outcome: ReplacementRequestOutcome.Declined }));

      // Act
      outcomeButton('[data-slot]', ReplacementRequestOutcome.Accepted).click();
      await settle();

      // Assert
      expect(updateRequestOutcome).toHaveBeenCalledWith('request-1', ReplacementRequestOutcome.Accepted, false);
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

    describe('accepted alternative', () => {
      const luc = candidate('client-9', 'Berta Beispiel');
      const tanja = candidate('client-7', 'Tanja Moser', { phone: '079 000 00 00' });

      const openAlternatives = async (): Promise<void> => {
        await submitWith([coveredSlot]);
        getCandidates.mockReturnValue(of({ eligible: [luc, tanja], excluded: [] }));
        getRequests.mockReturnValue(of([]));
        (query('.recovery-alternatives-toggle') as HTMLButtonElement).click();
        await settle();
      };

      const acceptTanja = async (isScenarioReplacement: boolean): Promise<void> => {
        recordRequest.mockReturnValue(
          of({ id: 'request-7', outcome: ReplacementRequestOutcome.Accepted, isScenarioReplacement }),
        );
        outcomeButton('[data-candidate="client-7"]', ReplacementRequestOutcome.Accepted).click();
        await settle();
      };

      it('makes the accepted alternative the stand-in of the slot and offers the former one as alternative', async () => {
        // Arrange
        await openAlternatives();
        readDatas.mockClear();
        getCandidates.mockClear();
        getCandidates.mockReturnValue(of({ eligible: [luc, tanja], excluded: [] }));

        // Act
        await acceptTanja(true);

        // Assert
        expect(query('[data-slot] .recovery-covered-head .recovery-name')?.textContent?.trim()).toBe('Tanja Moser');
        expect((query('[data-slot] > .recovery-covered-contact a.recovery-phone') as HTMLAnchorElement).getAttribute('href')).toBe('tel:0790000000');
        expect(query('[data-slot] > .recovery-covered-contact .recovery-outcome-state')?.textContent?.trim()).toBe(
          'recovery.dialog.outcomeState.Accepted',
        );
        expect(query('[data-slot] .recovery-tier')?.textContent?.trim()).toBe('recovery.dialog.tier.0');
        const rendered = Array.from(host.querySelectorAll('[data-candidate]')).map((el) => el.getAttribute('data-candidate'));
        expect(rendered).toEqual(['client-9']);
        expect(getCandidates).toHaveBeenCalledTimes(1);
        expect(readDatas).toHaveBeenCalledTimes(1);
      });

      it.each<[string, Partial<IReplacementCandidate>, string]>([
        ['own group, not on call', {}, 'recovery.dialog.tier.0'],
        ['own group, on call', { isOnCall: true }, 'recovery.dialog.tier.5'],
        ['borrowed, not on call', { isBorrowed: true }, 'recovery.dialog.tier.2'],
        ['borrowed, on call', { isBorrowed: true, isOnCall: true }, 'recovery.dialog.tier.6'],
      ])('labels an accepted alternative (%s) with its tier', async (_label, extra, expectedTier) => {
        // Arrange
        await submitWith([{ ...coveredSlot, tier: 1 }]);
        getRequests.mockReturnValue(of([]));
        getCandidates.mockReturnValue(of({ eligible: [candidate('client-7', 'Tanja Moser', extra)], excluded: [] }));
        (query('.recovery-alternatives-toggle') as HTMLButtonElement).click();
        await settle();

        // Act
        await acceptTanja(true);

        // Assert
        expect(query('[data-slot] .recovery-tier')?.textContent?.trim()).toBe(expectedTier);
      });

      it('saves the next answer on the row of the new stand-in', async () => {
        // Arrange
        await openAlternatives();
        await acceptTanja(true);
        updateRequestOutcome.mockReturnValue(of({ id: 'request-7', outcome: ReplacementRequestOutcome.Declined }));

        // Act
        host.querySelector<HTMLButtonElement>(
          `[data-slot] .recovery-covered-actions button[data-outcome="${ReplacementRequestOutcome.Declined}"]`,
        )!.click();
        await settle();

        // Assert
        expect(updateRequestOutcome).toHaveBeenCalledWith('request-7', ReplacementRequestOutcome.Declined, false);
      });

      it('sends the rule override of the submission with the answer', async () => {
        // Arrange
        await openAlternatives();
        (component as any).submission = { ...(component as any).submission, overrideBlock: true };

        // Act
        await acceptTanja(true);

        // Assert
        expect(recordRequest).toHaveBeenCalledWith(expect.objectContaining({ overrideBlock: true }));
      });

      it('keeps the stand-in when the server did not switch the slot', async () => {
        // Arrange
        await openAlternatives();
        readDatas.mockClear();

        // Act
        await acceptTanja(false);

        // Assert
        expect(query('[data-slot] .recovery-covered-head .recovery-name')?.textContent?.trim()).toBe('Berta Beispiel');
        expect(readDatas).not.toHaveBeenCalled();
      });

      it('keeps the stand-in on a declined answer', async () => {
        // Arrange
        await openAlternatives();
        readDatas.mockClear();
        recordRequest.mockReturnValue(
          of({ id: 'request-7', outcome: ReplacementRequestOutcome.Declined, isScenarioReplacement: false }),
        );

        // Act
        outcomeButton('[data-candidate="client-7"]', ReplacementRequestOutcome.Declined).click();
        await settle();

        // Assert
        expect(query('[data-slot] .recovery-covered-head .recovery-name')?.textContent?.trim()).toBe('Berta Beispiel');
        expect(readDatas).not.toHaveBeenCalled();
      });

      it('forgets the new stand-in when a new cover starts', async () => {
        // Arrange
        await openAlternatives();
        await acceptTanja(true);

        // Act
        (component as any).onBackToForm();
        await submitWith([coveredSlot]);

        // Assert
        expect(query('[data-slot] .recovery-covered-head .recovery-name')?.textContent?.trim()).toBe('Berta Beispiel');
      });
    });

    it('marks only an alternative held below a non-binding minimum level with the level hint', async () => {
      await submitWith([coveredSlot]);
      getCandidates.mockReturnValue(
        of({
          eligible: [
            candidate('client-8', 'Dora Dienst'),
            candidate('client-7', 'Carla Cover', { levelShortfall: 1 }),
          ],
          excluded: [],
        }),
      );

      (query('.recovery-alternatives-toggle') as HTMLButtonElement).click();
      await settle();

      expect(query('[data-candidate="client-7"] .recovery-level-shortfall')?.textContent?.trim()).toBe(
        'recovery.dialog.levelShortfall',
      );
      expect(query('[data-candidate="client-8"] .recovery-level-shortfall')).toBeNull();
    });

    it('marks a borrowed alternative and one whose contract has the day off, each with its own text', async () => {
      await submitWith([coveredSlot]);
      getCandidates.mockReturnValue(
        of({
          eligible: [
            candidate('client-5', 'Dora Dienst', { isBorrowed: false, isContractDayOff: false }),
            candidate('client-6', 'Lea Leihkraft', { isBorrowed: true, isContractDayOff: false }),
            candidate('client-7', 'Frida Frei', { isBorrowed: false, isContractDayOff: true }),
            candidate('client-8', 'Berit Beides', { isBorrowed: true, isContractDayOff: true }),
          ],
          excluded: [],
        }),
      );

      (query('.recovery-alternatives-toggle') as HTMLButtonElement).click();
      await settle();

      const marks = (clientId: string): (string | undefined)[] =>
        ['.recovery-borrowed', '.recovery-contract-day-off'].map((selector) =>
          query(`[data-candidate="${clientId}"] ${selector}`)?.textContent?.trim(),
        );
      expect(marks('client-5')).toEqual([undefined, undefined]);
      expect(marks('client-6')).toEqual(['recovery.dialog.borrowed', undefined]);
      expect(marks('client-7')).toEqual([undefined, 'recovery.dialog.contractDayOff']);
      expect(marks('client-8')).toEqual(['recovery.dialog.borrowed', 'recovery.dialog.contractDayOff']);
    });

    it('shows neither mark when an older server does not send the two fields', async () => {
      await submitWith([coveredSlot]);
      const legacy = candidate('client-7', 'Carla Cover');
      expect('isBorrowed' in legacy || 'isContractDayOff' in legacy).toBe(false);
      getCandidates.mockReturnValue(of({ eligible: [legacy], excluded: [] }));

      (query('.recovery-alternatives-toggle') as HTMLButtonElement).click();
      await settle();

      expect(query('[data-candidate="client-7"]')).not.toBeNull();
      expect(query('[data-candidate="client-7"] .recovery-borrowed')).toBeNull();
      expect(query('[data-candidate="client-7"] .recovery-contract-day-off')).toBeNull();
    });

    it('marks the alternatives whose own row the cover fits or breaks, and leaves neutral ones unmarked', async () => {
      await submitWith([coveredSlot]);
      getCandidates.mockReturnValue(
        of({
          eligible: [
            candidate('client-7', 'Carla Cover', { rhythmDelta: -2 }),
            candidate('client-8', 'Dora Dienst', { rhythmDelta: 2 }),
            candidate('client-9', 'Ella Einspringer', { rhythmDelta: 0 }),
          ],
          excluded: [],
        }),
      );

      (query('.recovery-alternatives-toggle') as HTMLButtonElement).click();
      await settle();

      expect(query('[data-candidate="client-7"] .recovery-rhythm-fits')?.textContent?.trim()).toBe('recovery.dialog.rhythmFits');
      expect(query('[data-candidate="client-8"] .recovery-rhythm-breaks')?.textContent?.trim()).toBe('recovery.dialog.rhythmBreaks');
      expect(query('[data-candidate="client-9"] .recovery-rhythm-fits')).toBeNull();
      expect(query('[data-candidate="client-9"] .recovery-rhythm-breaks')).toBeNull();
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
        kind: ReplacementRequestKind.Replacement,
        reversedAtUtc: null,
        isShortNotice: true,
        isScenarioReplacement: false,
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
