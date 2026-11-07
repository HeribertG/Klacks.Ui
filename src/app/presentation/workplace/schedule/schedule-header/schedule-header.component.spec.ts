// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { DirectionService } from 'src/app/application/services/direction.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS, ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { formatDateOnly } from 'src/app/domain/helpers/date.helper';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { IThoroughRecalculationCompletedNotification } from 'src/app/domain/interfaces/thorough-recalculation-completed-notification.interface';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { IPeriodHoursRecalculationResult } from 'src/app/domain/models/schedule/period-hours-recalculation-result.interface';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { ScheduleChangeService } from 'src/app/domain/services/schedule/schedule-change.service';
import { AutofillRunPresenceService } from 'src/app/domain/services/schedule/autofill-run-presence.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { ScheduleReportContextService } from 'src/app/domain/services/report/schedule-report-context.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { ScheduleDataService } from '../schedule-section/services/schedule-data.service';
import { AllScheduleStateService } from '../services/all-schedule-state.service';
import { AutoWizardOrchestratorService } from '../services/auto-wizard-orchestrator.service';
import { ScheduleSelectionService } from '../services/schedule-selection.service';
import { ScheduleTimelineRangeService } from '../services/schedule-timeline-range.service';
import { ScheduleViewModeService } from '../services/schedule-view-mode.service';
import { ScheduleHeaderComponent } from './schedule-header.component';
import { ScheduleHeaderPeriodNavigationService } from './services/schedule-header-period-navigation.service';
import { ScheduleHeaderRecalculationService } from './services/schedule-header-recalculation.service';
import { ScheduleHeaderBulkSendService } from './services/schedule-header-bulk-send.service';
import { ScheduleHeaderWizardMenuService } from './services/schedule-header-wizard-menu.service';
import { ScheduleHeaderToolsOverlayService } from './services/schedule-header-tools-overlay.service';
import { ScheduleHeaderDisplayTogglesService } from './services/schedule-header-display-toggles.service';

@Component({ selector: 'app-dialog-stub', template: '', standalone: true })
class DialogStubComponent {
  open = vi.fn();
}

@Component({ selector: 'app-icon-stub', template: '', standalone: true })
class IconStubComponent {
  ChangeColor = vi.fn();
}

const STUB_TEMPLATE = `
  <app-dialog-stub #wizardDialog />
  <app-dialog-stub #harmonizerDialog />
  <app-dialog-stub #holisticHarmonizerDialog />
  <app-dialog-stub #wizard4Dialog />
  <app-dialog-stub #recoveryDialog />
  <app-icon-stub #breakPlaceholderIcon />
  <app-icon-stub #scheduleCommandsIcon />
  <app-icon-stub #availabilityCheckIcon />
`;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SELECTED_GROUP = 'group-1';
const ACTIVE_TOKEN = 'token-1';
const PERIOD_START = new Date(Date.UTC(2026, 9, 1));
const PERIOD_END = new Date(Date.UTC(2026, 9, 31));
const VISIBLE_START = new Date(Date.UTC(2026, 8, 28));
const VISIBLE_END = new Date(Date.UTC(2026, 10, 1));
const NOTHING_FROZEN: IPeriodHoursRecalculationResult = { accepted: true, frozenSkipped: 0, nothingToRecalculate: false };
const TWO_FROZEN: IPeriodHoursRecalculationResult = { accepted: true, frozenSkipped: 2, nothingToRecalculate: false };
const FROZEN_REASON_CONTEXT = 'schedule-header-frozen-period-reason';

interface WorkFilterStub {
  paymentInterval: number;
  currentYear: number;
  currentMonth: number;
  currentWeek: number | undefined;
  selectedGroup: string | undefined;
}

interface PeriodApi {
  readonly paymentInterval: number;
  readonly displayYear: string;
  readonly displayPeriod: string;
  readonly selectedMonth: number;
  readonly selectedWeek: number;
  readonly currentYear: number;
  goToPrevious(): void;
  goToNext(): void;
  onCalendarReset(data: { year: number; month?: number; week?: number }): void;
}

interface RecalculationApi {
  isRecalculating: () => boolean;
  canRecalculate: () => boolean;
  onRecalculatePeriodHours(): Promise<void>;
  onThoroughRecalculateClick(): void;
  onThoroughRecalculateConfirmed(): Promise<void>;
}

interface BulkSendApi {
  isSending: () => boolean;
  isEmailConfigured: () => boolean;
  isSendDisabled: () => boolean;
  onSendAllSchedules(): Promise<void>;
}

interface WizardMenuApi {
  isWizardDropdownMode: () => boolean;
  isAutoWizardVisible: () => boolean;
  canUseAutofill: () => boolean;
  canCoverAbsence: () => boolean;
  onAutoWizardClick(): Promise<void>;
}

interface ToolsApi {
  toolsOpen: () => boolean;
  toggleTools(): void;
}

interface Deferred<T> { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void }

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('ScheduleHeaderComponent (characterization)', () => {
  let fixture: ComponentFixture<ScheduleHeaderComponent>;
  let component: ScheduleHeaderComponent;
  let calls: string[];
  let zoomEmits: number[];

  let workFilter: WorkFilterStub;
  let schedule: Record<string, unknown> & {
    workFilter: WorkFilterStub;
    clients: { id: string; firstName?: string; name?: string }[];
    periodStartDate: Date | null;
    periodEndDate: Date | null;
    visibleStartDate: Date | null;
    visibleEndDate: Date | null;
    hasAvailabilityData: boolean;
    isRead: ReturnType<typeof signal<boolean>>;
    showAvailability: ReturnType<typeof signal<boolean>>;
    showBreakPlaceholders: ReturnType<typeof signal<boolean>>;
  };
  let holidayYear: number | undefined;
  let dataService: { holidayCollection: { currentYear: number }; showScheduleCommands: ReturnType<typeof signal<boolean>> };
  let emailSettings: ReturnType<typeof signal<Record<string, unknown>>>;
  let hasDirtyClients: ReturnType<typeof signal<boolean>>;
  let granted: ReturnType<typeof signal<string[]>>;
  let selectedWork: ReturnType<typeof signal<{ clientId: string; date: Date } | null>>;
  let activeToken: ReturnType<typeof signal<string | null>>;
  let workloadEligible: ReturnType<typeof signal<boolean>>;
  let startBlocked: ReturnType<typeof signal<boolean>>;
  let completed$: Subject<IThoroughRecalculationCompletedNotification>;
  let recalcNormal: Deferred<IPeriodHoursRecalculationResult>;
  let recalcThorough: Deferred<IPeriodHoursRecalculationResult>;
  let sendDeferred: Deferred<{ success: number; failed: number; noEmail: number }>;

  let dataWorkSchedule: Record<string, ReturnType<typeof vi.fn>>;
  let toast: Record<string, ReturnType<typeof vi.fn>>;
  let modal: {
    openModal: ReturnType<typeof vi.fn>;
    openModel: ReturnType<typeof vi.fn>;
    resultEvent: Subject<ModalType>;
    reasonEvent: Subject<ModalType>;
    componentContext: string;
    contentInputTitle: string;
    contentInputString: string;
  };
  let reportContext: { sendForAllClients: ReturnType<typeof vi.fn> };
  let viewMode: Record<string, unknown> & {
    isTimelineMode: ReturnType<typeof signal<boolean>>;
    setViewMode: ReturnType<typeof vi.fn>;
    setTimelineRowHeightFactor: ReturnType<typeof vi.fn>;
  };
  let timelineRange: { viewRange: ReturnType<typeof signal<string>>; setViewRange: ReturnType<typeof vi.fn> };
  let orchestrator: Record<string, unknown> & { start: ReturnType<typeof vi.fn> };
  let allScheduleState: { saveCurrentFilter: ReturnType<typeof vi.fn> };

  const period = (): PeriodApi => fixture.debugElement.injector.get(ScheduleHeaderPeriodNavigationService);
  const recalculation = (): RecalculationApi => fixture.debugElement.injector.get(ScheduleHeaderRecalculationService);
  const bulkSend = (): BulkSendApi => fixture.debugElement.injector.get(ScheduleHeaderBulkSendService);
  const wizardMenu = (): WizardMenuApi => fixture.debugElement.injector.get(ScheduleHeaderWizardMenuService);
  const tools = (): ToolsApi => fixture.debugElement.injector.get(ScheduleHeaderToolsOverlayService);
  const displayToggles = () => fixture.debugElement.injector.get(ScheduleHeaderDisplayTogglesService);

  const translateInstant = (key: string, params?: Record<string, unknown>) =>
    params ? `${key}|${JSON.stringify(params)}` : key;

  const dialog = (name: string) =>
    fixture.debugElement.query((el) => el.references[name] !== undefined).componentInstance as DialogStubComponent;

  const icon = (name: string) =>
    fixture.debugElement.query((el) => el.references[name] !== undefined).componentInstance as IconStubComponent;

  const createComponent = () => {
    fixture = TestBed.createComponent(ScheduleHeaderComponent);
    component = fixture.componentInstance;
    component.zoomChange.subscribe((value) => zoomEmits.push(value));
    fixture.detectChanges();
  };

  beforeEach(() => {
    calls = [];
    zoomEmits = [];
    holidayYear = undefined;
    workFilter = {
      paymentInterval: PaymentInterval.Monthly,
      currentYear: 2026,
      currentMonth: 10,
      currentWeek: 40,
      selectedGroup: SELECTED_GROUP,
    };
    schedule = {
      workFilter,
      clients: [],
      periodStartDate: PERIOD_START,
      periodEndDate: PERIOD_END,
      visibleStartDate: VISIBLE_START,
      visibleEndDate: VISIBLE_END,
      hasAvailabilityData: false,
      isRead: signal(false),
      showAvailability: signal(false),
      showBreakPlaceholders: signal(false),
      readDatas: vi.fn(() => calls.push('readDatas')),
      toggleBreakPlaceholders: vi.fn(() => {
        calls.push('toggleBreakPlaceholders');
        schedule.showBreakPlaceholders.update((v) => !v);
      }),
      toggleAvailability: vi.fn(() => {
        calls.push('toggleAvailability');
        schedule.showAvailability.update((v) => !v);
      }),
    };
    dataService = {
      holidayCollection: {
        get currentYear() {
          return holidayYear as number;
        },
        set currentYear(value: number) {
          holidayYear = value;
          calls.push(`holidayYear:${value}`);
        },
      },
      showScheduleCommands: signal(false),
    };
    emailSettings = signal<Record<string, unknown>>({});
    hasDirtyClients = signal(true);
    granted = signal<string[]>([]);
    selectedWork = signal<{ clientId: string; date: Date } | null>(null);
    activeToken = signal<string | null>(ACTIVE_TOKEN);
    workloadEligible = signal(false);
    startBlocked = signal(false);
    completed$ = new Subject<IThoroughRecalculationCompletedNotification>();
    recalcNormal = deferred<IPeriodHoursRecalculationResult>();
    recalcThorough = deferred<IPeriodHoursRecalculationResult>();
    sendDeferred = deferred<{ success: number; failed: number; noEmail: number }>();

    dataWorkSchedule = {
      recalculatePeriodHours: vi.fn(() => ({
        subscribe: (observer: { next: (v: IPeriodHoursRecalculationResult) => void; error: (e: unknown) => void }) =>
          recalcNormal.promise.then(observer.next, observer.error),
      })),
      recalculatePeriodHoursThorough: vi.fn(() => ({
        subscribe: (observer: { next: (v: IPeriodHoursRecalculationResult) => void; error: (e: unknown) => void }) =>
          recalcThorough.promise.then(observer.next, observer.error),
      })),
    };
    toast = {
      showInfo: vi.fn((...args: unknown[]) => calls.push(`info:${String(args[1])}`)),
      showError: vi.fn((...args: unknown[]) => calls.push(`error:${String(args[1])}`)),
    };
    modal = {
      openModal: vi.fn(),
      openModel: vi.fn(),
      resultEvent: new Subject<ModalType>(),
      reasonEvent: new Subject<ModalType>(),
      componentContext: '',
      contentInputTitle: '',
      contentInputString: '',
    };
    reportContext = { sendForAllClients: vi.fn(() => sendDeferred.promise) };
    viewMode = {
      isTimelineMode: signal(false),
      timelineRowHeightFactor: signal(1.25),
      setViewMode: vi.fn((mode: string) => calls.push(`setViewMode:${mode}`)),
      setTimelineRowHeightFactor: vi.fn(),
    };
    timelineRange = { viewRange: signal('full'), setViewRange: vi.fn() };
    orchestrator = {
      isRunningForCurrentGroup: signal(false),
      isStartBlocked: startBlocked,
      busyGroupName: signal<string | null>(null),
      isWorkloadEligible: workloadEligible,
      start: vi.fn(() => Promise.resolve()),
    };
    allScheduleState = { saveCurrentFilter: vi.fn(() => calls.push('saveCurrentFilter')) };

    TestBed.configureTestingModule({
      imports: [ScheduleHeaderComponent],
      providers: [
        { provide: DirectionService, useValue: { direction: signal('ltr') } },
        { provide: GridSettingsService, useValue: { monthsName: MONTH_NAMES } },
        { provide: DataManagementScheduleService, useValue: schedule },
        { provide: BaseDataService, useValue: dataService },
        { provide: ScheduleDataService, useValue: dataService },
        { provide: AllScheduleStateService, useValue: allScheduleState },
        { provide: AppSettingsManagementService, useValue: { emailSettings } },
        { provide: WeekConfigurationService, useValue: { weekStartDay: signal(1) } },
        { provide: ScheduleReportContextService, useValue: reportContext },
        { provide: ToastShowService, useValue: toast },
        { provide: TranslateService, useValue: { instant: vi.fn(translateInstant) } },
        { provide: ScheduleChangeService, useValue: { hasDirtyClients } },
        { provide: DataWorkScheduleService, useValue: dataWorkSchedule },
        { provide: ScheduleViewModeService, useValue: viewMode },
        { provide: ScheduleTimelineRangeService, useValue: timelineRange },
        { provide: AnalyseScenarioService, useValue: { activeToken } },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: (permission: string) => granted().includes(permission) },
        },
        { provide: AutoWizardOrchestratorService, useValue: orchestrator },
        { provide: AutofillRunPresenceService, useValue: { isRunningForCurrentView: signal(false) } },
        { provide: ScheduleSelectionService, useValue: { selectedWork } },
        { provide: SCHEDULE_SIGNALR, useValue: { thoroughRecalculationCompleted$: completed$ } },
        { provide: ModalService, useValue: modal },
      ],
    });
    TestBed.overrideComponent(ScheduleHeaderComponent, {
      set: { template: STUB_TEMPLATE, imports: [DialogStubComponent, IconStubComponent] },
    });
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('lifecycle', () => {
    it('emits the default zoom and reads the timeline row height factor on init', () => {
      createComponent();

      expect(zoomEmits).toEqual([1]);
      expect((component as unknown as { timelineValue: number }).timelineValue).toBe(125);
    });

    it('colours the three toolbar icons after the view is ready', () => {
      schedule.showBreakPlaceholders.set(true);
      dataService.showScheduleCommands.set(false);
      schedule.showAvailability.set(true);

      createComponent();

      expect(icon('breakPlaceholderIcon').ChangeColor).toHaveBeenCalledWith(true);
      expect(icon('scheduleCommandsIcon').ChangeColor).toHaveBeenCalledWith(false);
      expect(icon('availabilityCheckIcon').ChangeColor).toHaveBeenCalledWith(true);
    });

    it('stops listening to thorough recalculation completions after destroy', () => {
      createComponent();
      fixture.destroy();

      completed$.next({ analyseToken: ACTIVE_TOKEN } as IThoroughRecalculationCompletedNotification);

      expect(toast['showInfo']).not.toHaveBeenCalled();
      expect(completed$.observed).toBe(false);
    });
  });

  describe('period display', () => {
    it('shows the calendar week for the weekly interval', () => {
      workFilter.paymentInterval = PaymentInterval.Weekly;
      workFilter.currentWeek = 5;
      createComponent();

      expect(period().displayPeriod).toBe('KW 5');
      expect(period().displayYear).toBe('2026');
    });

    it('shows the ISO weeks of the first and the second week of the biweekly period, across the year end', () => {
      workFilter.paymentInterval = PaymentInterval.Biweekly;
      workFilter.currentWeek = 53;
      createComponent();

      expect(period().displayPeriod).toBe('KW 53-1');

      workFilter.currentWeek = 51;
      expect(period().displayPeriod).toBe('KW 51-52');
    });

    it('shows the month name for monthly and every other interval', () => {
      createComponent();
      expect(period().displayPeriod).toBe('Oct');

      workFilter.paymentInterval = PaymentInterval.Individual;
      expect(period().displayPeriod).toBe('Oct');
    });

    it('falls back to week 1 when the filter has no week', () => {
      workFilter.currentWeek = undefined;
      createComponent();

      expect(period().selectedWeek).toBe(1);
    });
  });

  describe('period navigation', () => {
    it('wraps the month backwards into the previous year and reloads in order', () => {
      workFilter.currentMonth = 1;
      createComponent();

      period().goToPrevious();

      expect(workFilter.currentMonth).toBe(12);
      expect(workFilter.currentYear).toBe(2025);
      expect(calls).toEqual(['holidayYear:2025', 'readDatas', 'saveCurrentFilter']);
    });

    it('wraps the month forwards into the next year', () => {
      workFilter.currentMonth = 12;
      createComponent();

      period().goToNext();

      expect(workFilter.currentMonth).toBe(1);
      expect(workFilter.currentYear).toBe(2027);
    });

    it('steps the month inside the year', () => {
      createComponent();

      period().goToNext();
      expect(workFilter.currentMonth).toBe(11);
      period().goToPrevious();
      period().goToPrevious();
      expect(workFilter.currentMonth).toBe(9);
      expect(workFilter.currentYear).toBe(2026);
    });

    it('moves from week 1 to the last ISO week of the previous year', () => {
      workFilter.paymentInterval = PaymentInterval.Weekly;
      workFilter.currentWeek = 1;
      createComponent();

      period().goToPrevious();

      expect(workFilter.currentYear).toBe(2025);
      expect(workFilter.currentWeek).toBe(52);
    });

    it('moves past the 53rd week into week 1 of the next year', () => {
      workFilter.paymentInterval = PaymentInterval.Weekly;
      workFilter.currentWeek = 52;
      createComponent();

      period().goToNext();
      expect(workFilter.currentWeek).toBe(53);
      expect(workFilter.currentYear).toBe(2026);

      period().goToNext();
      expect(workFilter.currentWeek).toBe(1);
      expect(workFilter.currentYear).toBe(2027);
    });

    it('steps the week inside the year', () => {
      workFilter.paymentInterval = PaymentInterval.Weekly;
      workFilter.currentWeek = 10;
      createComponent();

      period().goToPrevious();
      expect(workFilter.currentWeek).toBe(9);
    });

    it('steps biweekly backwards by 14 days into the previous ISO year', () => {
      workFilter.paymentInterval = PaymentInterval.Biweekly;
      workFilter.currentYear = 2027;
      workFilter.currentWeek = 2;
      createComponent();

      period().goToPrevious();
      expect(workFilter.currentYear).toBe(2026);
      expect(workFilter.currentWeek).toBe(53);
      period().goToPrevious();
      expect(workFilter.currentYear).toBe(2026);
      expect(workFilter.currentWeek).toBe(51);

      workFilter.currentWeek = 1;
      period().goToPrevious();
      expect(workFilter.currentYear).toBe(2025);
      expect(workFilter.currentWeek).toBe(51);
    });

    it('steps biweekly by 14 days from 2026 W49 to 2027 W2 without overlap at the 53-week year end', () => {
      workFilter.paymentInterval = PaymentInterval.Biweekly;
      workFilter.currentWeek = 49;
      createComponent();

      period().goToNext();
      expect(workFilter.currentWeek).toBe(51);
      period().goToNext();
      expect(workFilter.currentWeek).toBe(53);
      expect(period().displayPeriod).toBe('KW 53-1');
      period().goToNext();
      expect(workFilter.currentWeek).toBe(2);
      expect(workFilter.currentYear).toBe(2027);
      expect(period().displayPeriod).toBe('KW 2-3');

      period().goToPrevious();
      expect(workFilter.currentYear).toBe(2026);
      expect(workFilter.currentWeek).toBe(53);
      workFilter.currentWeek = 7;
      period().goToPrevious();
      expect(workFilter.currentWeek).toBe(5);
    });

    it('steps biweekly from a week stored by the former odd-week rule onto the next real period', () => {
      workFilter.paymentInterval = PaymentInterval.Biweekly;
      workFilter.currentYear = 2027;
      workFilter.currentWeek = 1;
      createComponent();

      period().goToNext();

      expect(workFilter.currentYear).toBe(2027);
      expect(workFilter.currentWeek).toBe(2);
    });

    it('applies a calendar reset with a week and keeps the month', () => {
      createComponent();

      period().onCalendarReset({ year: 2024, week: 12 });

      expect(workFilter.currentYear).toBe(2024);
      expect(workFilter.currentWeek).toBe(12);
      expect(workFilter.currentMonth).toBe(10);
      expect(calls).toEqual(['holidayYear:2024', 'readDatas', 'saveCurrentFilter']);
    });

    it('applies a calendar reset with a month and keeps the week', () => {
      createComponent();

      period().onCalendarReset({ year: 2028, month: 3 });

      expect(workFilter.currentYear).toBe(2028);
      expect(workFilter.currentMonth).toBe(3);
      expect(workFilter.currentWeek).toBe(40);
    });
  });

  describe('normal recalculation', () => {
    it('recalculates the period of the selected group and resets the flag afterwards', async () => {
      createComponent();

      const pending = recalculation().onRecalculatePeriodHours();
      expect(recalculation().isRecalculating()).toBe(true);
      expect(dataWorkSchedule['recalculatePeriodHours']).toHaveBeenCalledWith(
        formatDateOnly(PERIOD_START),
        formatDateOnly(PERIOD_END),
        SELECTED_GROUP,
        undefined,
      );

      recalcNormal.resolve(NOTHING_FROZEN);
      await pending;

      expect(recalculation().isRecalculating()).toBe(false);
      expect(toast['showInfo']).toHaveBeenCalledWith('schedule.recalculate.success', 'recalculate', '', TOAST_ICONS.INFO);
    });

    it('shows an error toast and resets the flag when the request fails', async () => {
      createComponent();

      const pending = recalculation().onRecalculatePeriodHours();
      recalcNormal.reject(new Error('boom'));
      await pending;

      expect(recalculation().isRecalculating()).toBe(false);
      expect(toast['showError']).toHaveBeenCalledWith('schedule.recalculate.error', 'recalculate');
    });

    it('does nothing without a period or while a recalculation runs', async () => {
      schedule.periodEndDate = null;
      createComponent();

      await recalculation().onRecalculatePeriodHours();
      expect(recalculation().isRecalculating()).toBe(false);
      expect(dataWorkSchedule['recalculatePeriodHours']).not.toHaveBeenCalled();

      schedule.periodEndDate = PERIOD_END;
      const pending = recalculation().onRecalculatePeriodHours();
      await recalculation().onRecalculatePeriodHours();
      expect(dataWorkSchedule['recalculatePeriodHours']).toHaveBeenCalledTimes(1);
      recalcNormal.resolve(NOTHING_FROZEN);
      await pending;
    });
  });

  describe('frozen periods', () => {
    const enterReason = (reason: string) => {
      modal.contentInputString = reason;
      modal.resultEvent.next(ModalType.Input);
    };

    const confirmOverride = () => (modal.openModal.mock.calls[0][0] as { onConfirm: () => void }).onConfirm();

    beforeEach(() => granted.set([ROLE_ADMIN]));

    it('offers the recalculation to everyone who may edit the schedule, planners included', () => {
      granted.set([]);
      createComponent();
      expect(recalculation().canRecalculate()).toBe(false);

      granted.set([PERMISSIONS.CanEditSchedule]);
      expect(recalculation().canRecalculate()).toBe(true);
    });

    it('only tells a non-admin how many frozen periods were skipped, without dialog or override', async () => {
      granted.set([PERMISSIONS.CanEditSchedule]);
      createComponent();

      const pending = recalculation().onRecalculatePeriodHours();
      recalcNormal.resolve(TWO_FROZEN);
      await pending;

      expect(modal.openModal).not.toHaveBeenCalled();
      expect(modal.openModel).not.toHaveBeenCalled();
      expect(toast['showInfo']).toHaveBeenCalledWith(
        'schedule.recalculate.frozen.adminOnly|{"count":2}',
        'recalculate-frozen',
        '',
        TOAST_ICONS.INFO,
      );
      expect(dataWorkSchedule['recalculatePeriodHours']).toHaveBeenCalledTimes(1);
    });

    it('only tells a non-admin about skipped frozen periods after a thorough run as well', async () => {
      granted.set([PERMISSIONS.CanEditSchedule]);
      createComponent();

      const pending = recalculation().onThoroughRecalculateConfirmed();
      recalcThorough.resolve(TWO_FROZEN);
      await pending;

      expect(modal.openModal).not.toHaveBeenCalled();
      expect(toast['showInfo']).toHaveBeenCalledWith(
        'schedule.recalculate.frozen.adminOnly|{"count":2}',
        'recalculate-frozen',
        '',
        TOAST_ICONS.INFO,
      );
      expect(dataWorkSchedule['recalculatePeriodHoursThorough']).toHaveBeenCalledTimes(1);
    });

    it('offers no override when nothing was frozen', async () => {
      createComponent();

      const pending = recalculation().onRecalculatePeriodHours();
      recalcNormal.resolve(NOTHING_FROZEN);
      await pending;

      expect(modal.openModal).not.toHaveBeenCalled();
    });

    it('offers the override, asks for a reason and sends the normal run again with it', async () => {
      createComponent();
      const pending = recalculation().onRecalculatePeriodHours();
      recalcNormal.resolve(TWO_FROZEN);
      await pending;

      expect(modal.openModal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ModalType.Confirmation,
          title: 'schedule.recalculate.frozen.title',
          message: 'schedule.recalculate.frozen.message|{"count":2}',
          confirmText: 'schedule.recalculate.frozen.include',
        }),
      );
      confirmOverride();
      expect(modal.openModel).toHaveBeenCalledWith(ModalType.Input);
      expect(modal.componentContext).toBe(FROZEN_REASON_CONTEXT);
      expect(modal.contentInputTitle).toBe('schedule.recalculate.frozen.reason');

      recalcNormal = deferred<IPeriodHoursRecalculationResult>();
      enterReason('  payroll correction  ');
      expect(dataWorkSchedule['recalculatePeriodHours']).toHaveBeenLastCalledWith(
        formatDateOnly(PERIOD_START),
        formatDateOnly(PERIOD_END),
        SELECTED_GROUP,
        { confirmFrozen: true, reason: 'payroll correction' },
      );
      expect(modal.componentContext).toBe('');
      recalcNormal.resolve(NOTHING_FROZEN);
    });

    it('sends the thorough override even while the first thorough run waits for its completion', async () => {
      createComponent();
      const pending = recalculation().onThoroughRecalculateConfirmed();
      recalcThorough.resolve(TWO_FROZEN);
      await pending;
      expect(recalculation().isRecalculating()).toBe(true);

      confirmOverride();
      recalcThorough = deferred<IPeriodHoursRecalculationResult>();
      enterReason('late correction');

      expect(dataWorkSchedule['recalculatePeriodHoursThorough']).toHaveBeenLastCalledWith(
        formatDateOnly(PERIOD_START),
        formatDateOnly(PERIOD_END),
        SELECTED_GROUP,
        ACTIVE_TOKEN,
        { confirmFrozen: true, reason: 'late correction' },
      );
      recalcThorough.resolve(NOTHING_FROZEN);
    });

    it('ignores a blank reason, a dismissed reason dialog and input dialogs of other components', async () => {
      createComponent();
      const pending = recalculation().onRecalculatePeriodHours();
      recalcNormal.resolve(TWO_FROZEN);
      await pending;

      confirmOverride();
      enterReason('   ');
      expect(dataWorkSchedule['recalculatePeriodHours']).toHaveBeenCalledTimes(1);
      expect(modal.componentContext).toBe('');

      confirmOverride();
      modal.reasonEvent.next(ModalType.Input);
      expect(modal.componentContext).toBe('');

      modal.componentContext = 'inbox-create-folder';
      enterReason('not mine');
      expect(dataWorkSchedule['recalculatePeriodHours']).toHaveBeenCalledTimes(1);
      expect(modal.componentContext).toBe('inbox-create-folder');
    });
  });

  describe('thorough recalculation', () => {
    it('asks for confirmation with the translated texts', () => {
      createComponent();

      recalculation().onThoroughRecalculateClick();

      expect(modal.openModal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ModalType.Confirmation,
          title: 'schedule.recalculate.thorough.title',
          message: 'schedule.recalculate.thorough.warning',
          confirmText: 'schedule.recalculate.thorough.start',
          cancelText: 'cancel',
        }),
      );
    });

    it('does not ask again while a recalculation runs', async () => {
      createComponent();
      const pending = recalculation().onRecalculatePeriodHours();

      recalculation().onThoroughRecalculateClick();

      expect(modal.openModal).not.toHaveBeenCalled();
      recalcNormal.resolve(NOTHING_FROZEN);
      await pending;
    });

    it('queues the thorough run on confirm and keeps the flag until the matching completion arrives', async () => {
      createComponent();
      recalculation().onThoroughRecalculateClick();
      const options = modal.openModal.mock.calls[0][0] as { onConfirm: () => Promise<void> };

      const pending = options.onConfirm();
      expect(dataWorkSchedule['recalculatePeriodHoursThorough']).toHaveBeenCalledWith(
        formatDateOnly(PERIOD_START),
        formatDateOnly(PERIOD_END),
        SELECTED_GROUP,
        ACTIVE_TOKEN,
        undefined,
      );
      recalcThorough.resolve(NOTHING_FROZEN);
      await pending;

      expect(recalculation().isRecalculating()).toBe(true);
      expect(toast['showInfo']).toHaveBeenCalledWith(
        'schedule.recalculate.thorough.started',
        'recalculate-thorough',
        '',
        TOAST_ICONS.INFO,
      );

      calls = [];
      completed$.next({ analyseToken: 'other-token' } as IThoroughRecalculationCompletedNotification);
      expect(recalculation().isRecalculating()).toBe(true);
      expect(calls).toEqual([]);

      completed$.next({ analyseToken: ACTIVE_TOKEN } as IThoroughRecalculationCompletedNotification);
      expect(recalculation().isRecalculating()).toBe(false);
      expect(calls).toEqual(['info:recalculate-thorough', 'readDatas']);
      expect(toast['showInfo']).toHaveBeenLastCalledWith(
        'schedule.recalculate.thorough.completed',
        'recalculate-thorough',
        '',
        TOAST_ICONS.INFO,
      );
    });

    it('treats a missing token on both sides as a match', () => {
      activeToken.set(null);
      createComponent();

      completed$.next({} as IThoroughRecalculationCompletedNotification);

      expect(calls).toEqual(['info:recalculate-thorough', 'readDatas']);
    });

    it('resets the flag and shows an error when queuing fails', async () => {
      createComponent();

      const pending = recalculation().onThoroughRecalculateConfirmed();
      expect(recalculation().isRecalculating()).toBe(true);
      recalcThorough.reject(new Error('boom'));
      await pending;

      expect(recalculation().isRecalculating()).toBe(false);
      expect(toast['showError']).toHaveBeenCalledWith('schedule.recalculate.thorough.error', 'recalculate-thorough');
    });

    it('resets the flag and shows an error when the server did not queue the run', async () => {
      createComponent();

      const pending = recalculation().onThoroughRecalculateConfirmed();
      recalcThorough.resolve({ accepted: false, frozenSkipped: 0, nothingToRecalculate: false });
      await pending;

      expect(recalculation().isRecalculating()).toBe(false);
      expect(toast['showError']).toHaveBeenCalledWith('schedule.recalculate.thorough.error', 'recalculate-thorough');
      expect(toast['showInfo']).not.toHaveBeenCalledWith(
        'schedule.recalculate.thorough.started',
        'recalculate-thorough',
        '',
        TOAST_ICONS.INFO,
      );
    });

    it('resets the flag without waiting for a completion when the server found nobody to recalculate', async () => {
      createComponent();

      const pending = recalculation().onThoroughRecalculateConfirmed();
      recalcThorough.resolve({ accepted: true, frozenSkipped: 0, nothingToRecalculate: true });
      await pending;

      expect(recalculation().isRecalculating()).toBe(false);
      expect(toast['showError']).not.toHaveBeenCalled();
      expect(toast['showInfo']).toHaveBeenCalledWith(
        'schedule.recalculate.thorough.completed',
        'recalculate-thorough',
        '',
        TOAST_ICONS.INFO,
      );
      expect(toast['showInfo']).not.toHaveBeenCalledWith(
        'schedule.recalculate.thorough.started',
        'recalculate-thorough',
        '',
        TOAST_ICONS.INFO,
      );
      expect(modal.openModal).not.toHaveBeenCalled();
    });

    describe('with a frozen override next to the first run', () => {
      const startFirstRunAndOverride = async () => {
        granted.set([ROLE_ADMIN]);
        createComponent();
        const pending = recalculation().onThoroughRecalculateConfirmed();
        recalcThorough.resolve(TWO_FROZEN);
        await pending;
        (modal.openModal.mock.calls[0][0] as { onConfirm: () => void }).onConfirm();
        recalcThorough = deferred<IPeriodHoursRecalculationResult>();
        modal.contentInputString = 'late correction';
        modal.resultEvent.next(ModalType.Input);
      };

      it('keeps the flag after the first completion until the override run completes as well', async () => {
        await startFirstRunAndOverride();
        recalcThorough.resolve(NOTHING_FROZEN);
        await recalcThorough.promise;

        completed$.next({ analyseToken: ACTIVE_TOKEN } as IThoroughRecalculationCompletedNotification);
        expect(recalculation().isRecalculating()).toBe(true);

        completed$.next({ analyseToken: ACTIVE_TOKEN } as IThoroughRecalculationCompletedNotification);
        expect(recalculation().isRecalculating()).toBe(false);
      });

      it('keeps the flag of the first run when the override request fails', async () => {
        await startFirstRunAndOverride();
        recalcThorough.reject(new Error('boom'));
        await recalcThorough.promise.catch(() => undefined);
        await Promise.resolve();

        expect(toast['showError']).toHaveBeenCalledWith('schedule.recalculate.thorough.error', 'recalculate-thorough');
        expect(recalculation().isRecalculating()).toBe(true);

        completed$.next({ analyseToken: ACTIVE_TOKEN } as IThoroughRecalculationCompletedNotification);
        expect(recalculation().isRecalculating()).toBe(false);
      });
    });

    it('never counts below zero when a completion arrives without an own run', async () => {
      createComponent();
      completed$.next({ analyseToken: ACTIVE_TOKEN } as IThoroughRecalculationCompletedNotification);

      const pending = recalculation().onThoroughRecalculateConfirmed();
      recalcThorough.resolve(NOTHING_FROZEN);
      await pending;
      expect(recalculation().isRecalculating()).toBe(true);

      completed$.next({ analyseToken: ACTIVE_TOKEN } as IThoroughRecalculationCompletedNotification);
      expect(recalculation().isRecalculating()).toBe(false);
    });

    it('does not start without a period', async () => {
      schedule.periodStartDate = null;
      createComponent();

      await recalculation().onThoroughRecalculateConfirmed();

      expect(recalculation().isRecalculating()).toBe(false);
      expect(dataWorkSchedule['recalculatePeriodHoursThorough']).not.toHaveBeenCalled();
    });
  });

  describe('bulk send', () => {
    it('is configured only with server, port, user and password', () => {
      createComponent();
      expect(bulkSend().isEmailConfigured()).toBe(false);

      emailSettings.set({ outgoingServer: 'smtp', outgoingServerPort: '25', username: 'u', password: 'p' });
      expect(bulkSend().isEmailConfigured()).toBe(true);

      emailSettings.set({ outgoingServer: 'smtp', outgoingServerPort: '25', username: 'u', password: '' });
      expect(bulkSend().isEmailConfigured()).toBe(false);
    });

    it('is disabled without dirty clients', () => {
      hasDirtyClients.set(false);
      createComponent();

      expect(bulkSend().isSendDisabled()).toBe(true);
      hasDirtyClients.set(true);
      expect(bulkSend().isSendDisabled()).toBe(false);
    });

    it('sends the visible range for every client with an id and toasts the summary', async () => {
      schedule.clients = [
        { id: 'c1', firstName: 'Anna', name: 'Muster' },
        { id: '', firstName: 'Ghost', name: 'Row' },
        { id: 'c3', name: 'Solo' },
      ];
      createComponent();

      const pending = bulkSend().onSendAllSchedules();
      expect(bulkSend().isSending()).toBe(true);
      expect(bulkSend().isSendDisabled()).toBe(true);
      expect(reportContext.sendForAllClients).toHaveBeenCalledWith(
        [
          { id: 'c1', name: 'Anna Muster' },
          { id: 'c3', name: 'Solo' },
        ],
        formatDateOnly(VISIBLE_START),
        formatDateOnly(VISIBLE_END),
      );

      sendDeferred.resolve({ success: 2, failed: 1, noEmail: 0 });
      await pending;

      expect(bulkSend().isSending()).toBe(false);
      expect(toast['showInfo']).toHaveBeenCalledWith(
        'schedule.send.bulk.summary|{"success":2,"failed":1,"noEmail":0}',
        'bulk-send',
        '',
        TOAST_ICONS.INFO,
      );
    });

    it('shows the bulk error and resets the flag when sending fails', async () => {
      schedule.clients = [{ id: 'c1', firstName: 'Anna', name: 'Muster' }];
      createComponent();

      const pending = bulkSend().onSendAllSchedules();
      sendDeferred.reject(new Error('boom'));
      await pending;

      expect(bulkSend().isSending()).toBe(false);
      expect(toast['showError']).toHaveBeenCalledWith('schedule.send.error.failed|{"clientName":"Bulk"}', 'bulk-send');
    });

    it('does nothing when disabled, without clients or without a visible range', async () => {
      createComponent();
      await bulkSend().onSendAllSchedules();

      schedule.clients = [{ id: 'c1' }];
      schedule.visibleStartDate = null;
      await bulkSend().onSendAllSchedules();

      schedule.visibleStartDate = VISIBLE_START;
      hasDirtyClients.set(false);
      await bulkSend().onSendAllSchedules();

      expect(reportContext.sendForAllClients).not.toHaveBeenCalled();
      expect(bulkSend().isSending()).toBe(false);
    });
  });

  describe('wizard menu', () => {
    const shortcut = (target: EventTarget = document, init: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      target.dispatchEvent(event);
      return event;
    };

    it('toggles the dropdown mode with Ctrl+Shift+H for admins only', () => {
      createComponent();

      const denied = shortcut();
      expect(wizardMenu().isWizardDropdownMode()).toBe(false);
      expect(denied.defaultPrevented).toBe(false);

      granted.set([ROLE_ADMIN]);
      const accepted = shortcut();
      expect(wizardMenu().isWizardDropdownMode()).toBe(true);
      expect(accepted.defaultPrevented).toBe(true);

      shortcut();
      expect(wizardMenu().isWizardDropdownMode()).toBe(false);
    });

    it('ignores the shortcut in text fields and without both modifiers', () => {
      granted.set([ROLE_ADMIN]);
      createComponent();
      const input = document.createElement('input');
      const textarea = document.createElement('textarea');
      document.body.append(input, textarea);

      shortcut(input);
      shortcut(textarea);
      shortcut(document, { shiftKey: false });
      shortcut(document, { key: 'j' });

      expect(wizardMenu().isWizardDropdownMode()).toBe(false);
      input.remove();
      textarea.remove();
    });

    it('allows autofill for admins and absence cover for schedule editors with a selected work', () => {
      createComponent();
      expect(wizardMenu().canUseAutofill()).toBe(false);
      expect(wizardMenu().canCoverAbsence()).toBe(false);

      granted.set([PERMISSIONS.CanEditSchedule]);
      expect(wizardMenu().canCoverAbsence()).toBe(false);
      selectedWork.set({ clientId: 'c1', date: PERIOD_START });
      expect(wizardMenu().canCoverAbsence()).toBe(true);

      granted.set([ROLE_ADMIN]);
      expect(wizardMenu().canUseAutofill()).toBe(true);
    });

    it('shows the auto wizard when the workload is eligible or a start is blocked', () => {
      createComponent();
      expect(wizardMenu().isAutoWizardVisible()).toBe(false);

      startBlocked.set(true);
      expect(wizardMenu().isAutoWizardVisible()).toBe(true);
      startBlocked.set(false);
      workloadEligible.set(true);
      expect(wizardMenu().isAutoWizardVisible()).toBe(true);
    });

    it('starts the auto wizard', async () => {
      createComponent();

      await wizardMenu().onAutoWizardClick();

      expect(orchestrator.start).toHaveBeenCalledTimes(1);
    });

    it('opens the wizard dialogs', () => {
      createComponent();

      component.onWizardClick();
      component.onHarmonizerClick();
      component.onHolisticHarmonizerClick();
      component.onWizard4Click();

      expect(dialog('wizardDialog').open).toHaveBeenCalledTimes(1);
      expect(dialog('harmonizerDialog').open).toHaveBeenCalledTimes(1);
      expect(dialog('holisticHarmonizerDialog').open).toHaveBeenCalledTimes(1);
      expect(dialog('wizard4Dialog').open).toHaveBeenCalledTimes(1);
    });

    it('opens the recovery dialog only for a selected work', () => {
      createComponent();

      component.onRecoveryClick();
      expect(dialog('recoveryDialog').open).not.toHaveBeenCalled();

      selectedWork.set({ clientId: 'c1', date: PERIOD_START });
      component.onRecoveryClick();
      expect(dialog('recoveryDialog').open).toHaveBeenCalledWith({ clientId: 'c1', date: PERIOD_START });
    });
  });

  describe('tools overlay', () => {
    it('closes on a click outside the tools and on escape, but not on a click inside', () => {
      createComponent();
      const inside = document.createElement('div');
      inside.className = 'header-tools';
      const child = document.createElement('span');
      inside.append(child);
      const toggle = document.createElement('button');
      toggle.className = 'header-tools-toggle';
      const outside = document.createElement('div');
      document.body.append(inside, toggle, outside);

      tools().toggleTools();
      expect(tools().toolsOpen()).toBe(true);

      child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(tools().toolsOpen()).toBe(true);

      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(tools().toolsOpen()).toBe(false);

      tools().toggleTools();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(tools().toolsOpen()).toBe(false);

      tools().toggleTools();
      tools().toggleTools();
      expect(tools().toolsOpen()).toBe(false);
      inside.remove();
      toggle.remove();
      outside.remove();
    });
  });

  describe('zoom and view mode', () => {
    it('resets a non-default zoom before switching to the timeline', () => {
      createComponent();
      zoomEmits = [];
      calls = [];
      (component as unknown as { value: number }).value = 150;

      component.onViewModeToggleChanged(true);

      expect((component as unknown as { value: number }).value).toBe(100);
      expect(zoomEmits).toEqual([1]);
      expect(calls).toEqual(['setViewMode:timeline']);
    });

    it('switches back to the table without a zoom emit', () => {
      createComponent();
      zoomEmits = [];

      component.onViewModeToggleChanged(false);
      component.onViewModeToggleChanged(true);

      expect(zoomEmits).toEqual([]);
      expect(viewMode.setViewMode).toHaveBeenNthCalledWith(1, 'table');
      expect(viewMode.setViewMode).toHaveBeenNthCalledWith(2, 'timeline');
    });

    it('emits the rounded zoom factor on slider change and forwards the row height factor', () => {
      createComponent();
      zoomEmits = [];
      (component as unknown as { value: number }).value = 150;
      (component as unknown as { timelineValue: number }).timelineValue = 130;

      component.onChange();
      component.onTimelineRowHeightChange();

      expect(zoomEmits).toEqual([1.5]);
      expect(viewMode.setTimelineRowHeightFactor).toHaveBeenCalledWith(1.3);
    });

    it('forwards the timeline range and the pdf export request', () => {
      createComponent();
      let pdfRequests = 0;
      component.pdfExportRequested.subscribe(() => pdfRequests++);

      component.onTimelineRangeChange('day');
      component.onPdfExport();

      expect(timelineRange.setViewRange).toHaveBeenCalledWith('day');
      expect(pdfRequests).toBe(1);
    });
  });

  describe('display toggles', () => {
    it('toggles break placeholders, commands and availability and recolours their icons', () => {
      createComponent();

      displayToggles().toggleBreakPlaceholders(icon('breakPlaceholderIcon') as never);
      displayToggles().toggleScheduleCommands(icon('scheduleCommandsIcon') as never);
      displayToggles().onAvailabilityCheck(icon('availabilityCheckIcon') as never);

      expect(icon('breakPlaceholderIcon').ChangeColor).toHaveBeenLastCalledWith(true);
      expect(icon('scheduleCommandsIcon').ChangeColor).toHaveBeenLastCalledWith(true);
      expect(icon('availabilityCheckIcon').ChangeColor).toHaveBeenLastCalledWith(true);
      expect(dataService.showScheduleCommands()).toBe(true);
      expect(calls).toEqual(['toggleBreakPlaceholders', 'toggleAvailability']);
    });

    it('re-reads the availability flag after every schedule load', () => {
      createComponent();
      expect(displayToggles().hasAvailabilityData()).toBe(false);

      schedule.hasAvailabilityData = true;
      expect(displayToggles().hasAvailabilityData()).toBe(false);
      schedule.isRead.set(true);
      expect(displayToggles().hasAvailabilityData()).toBe(true);
    });
  });
});
