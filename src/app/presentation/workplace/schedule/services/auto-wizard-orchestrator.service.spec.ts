// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal, WritableSignal } from '@angular/core';
import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AutoWizardOrchestratorService } from './auto-wizard-orchestrator.service';
import { DataAutoWizardService } from 'src/app/infrastructure/api/auto-wizard/data-auto-wizard.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import { ScheduleLoadCompletionService } from 'src/app/domain/services/schedule/schedule-load-completion.service';
import { SCHEDULE_LOAD_OUTCOME } from 'src/app/domain/constants/schedule-load-completion.constants';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { ENTITY_STATE_PROVIDER_TOKEN } from 'src/app/domain/interfaces/entity-state-provider.interface';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { CollisionDetectionService } from 'src/app/domain/services/schedule/collision-detection.service';

const selectedGroupId = signal<string | undefined>(undefined);
const visibleEntity = signal<string>(EntityName.SCHEDULE);

beforeEach(() => {
  sessionStorage.clear();
  selectedGroupId.set(undefined);
  visibleEntity.set(EntityName.SCHEDULE);
  TestBed.configureTestingModule({
    providers: [
      { provide: CollisionDetectionService, useValue: { errorEntries: signal([]) } },
      {
        provide: GroupSelectionService,
        useValue: {
          get selectedGroupId() {
            return selectedGroupId();
          },
          get selectedGroup() {
            const id = selectedGroupId();
            return id ? { id, name: `Name-${id}` } : undefined;
          },
        },
      },
      { provide: ENTITY_STATE_PROVIDER_TOKEN, useValue: { nameOfVisibleEntity: visibleEntity } },
    ],
  });
});

afterEach(() => sessionStorage.clear());

const AGENT_COUNT = 200;
const SHIFT_COUNT = 80;

function buildScheduleStub(startDate: Date, endDate: Date) {
  return {
    periodStartDate: startDate,
    periodEndDate: endDate,
    clients: Array.from({ length: AGENT_COUNT }, (_, i) => ({ id: `agent-${i}` })),
    shiftSchedules: Array.from({ length: SHIFT_COUNT }, (_, i) => ({ shiftId: `shift-${i}` })),
    workFilter: { selectedGroup: undefined },
    isIndividualClientSortActive: false,
    isRead: signal({ count: 0, resetScroll: false }),
    readDatas: vi.fn(),
  } as unknown as DataManagementScheduleService;
}

function buildTranslateStub(instant: (key: string, params?: object) => unknown) {
  return { instant, currentLang: 'de' } as unknown as TranslateService;
}

async function runExceedsLimits(startDate: Date, endDate: Date): Promise<number | undefined> {
  const instant = vi.fn((key: string, _params?: object) => key);

  TestBed.configureTestingModule({
    providers: [
      { provide: CollisionDetectionService, useValue: { errorEntries: signal([]) } },
      {
        provide: DataAutoWizardService,
        useValue: { status: signal('idle'), start: vi.fn().mockResolvedValue('job-1') } as unknown as DataAutoWizardService,
      },
      { provide: DataManagementScheduleService, useValue: buildScheduleStub(startDate, endDate) },
      { provide: AnalyseScenarioService, useValue: { activeToken: () => null } as unknown as AnalyseScenarioService },
      { provide: ToastShowService, useValue: { showError: vi.fn(), showInfo: vi.fn() } as unknown as ToastShowService },
      { provide: TranslateService, useValue: buildTranslateStub(instant) },
      { provide: ScheduleLoadCompletionService, useValue: { awaitFullyLoaded: vi.fn().mockResolvedValue(SCHEDULE_LOAD_OUTCOME.Complete) } },
    ],
  });

  const orchestrator = TestBed.inject(AutoWizardOrchestratorService);
  await orchestrator.start();

  const call = instant.mock.calls.find(([key]) => key === 'autoWizard.toast.tooLarge');
  return (call?.[1] as { days?: number } | undefined)?.days;
}

describe('AutoWizardOrchestratorService day count across a DST transition', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('Europe/Zurich spring-forward (2026-03-29)', () => {
    useTimeZone('Europe/Zurich');

    it('counts 3 calendar days for 2026-03-28..2026-03-30', async () => {
      expect(new Date(2026, 2, 30).getTimezoneOffset()).not.toBe(new Date(2026, 2, 28).getTimezoneOffset());
      const days = await runExceedsLimits(new Date(2026, 2, 28), new Date(2026, 2, 30));
      expect(days).toBe(3);
    });
  });

  describe('America/New_York spring-forward (2026-03-08)', () => {
    useTimeZone('America/New_York');

    it('counts 3 calendar days for 2026-03-07..2026-03-09', async () => {
      expect(new Date(2026, 2, 9).getTimezoneOffset()).not.toBe(new Date(2026, 2, 7).getTimezoneOffset());
      const days = await runExceedsLimits(new Date(2026, 2, 7), new Date(2026, 2, 9));
      expect(days).toBe(3);
    });
  });
});

describe('AutoWizardOrchestratorService while the schedule is still loading', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('does not start and reports incomplete data when loading stalls', async () => {
    // Arrange
    const start = vi.fn().mockResolvedValue('job-1');
    const showError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: CollisionDetectionService, useValue: { errorEntries: signal([]) } },
        { provide: DataAutoWizardService, useValue: { status: signal('idle'), start } as unknown as DataAutoWizardService },
        { provide: DataManagementScheduleService, useValue: buildScheduleStub(new Date(2026, 5, 1), new Date(2026, 5, 7)) },
        { provide: AnalyseScenarioService, useValue: { activeToken: () => null } as unknown as AnalyseScenarioService },
        { provide: ToastShowService, useValue: { showError, showInfo: vi.fn() } as unknown as ToastShowService },
        { provide: TranslateService, useValue: buildTranslateStub(vi.fn((key: string) => key)) },
        { provide: ScheduleLoadCompletionService, useValue: { awaitFullyLoaded: vi.fn().mockResolvedValue(SCHEDULE_LOAD_OUTCOME.Stalled) } },
      ],
    });

    // Act
    await TestBed.inject(AutoWizardOrchestratorService).start();

    // Assert
    expect(start).not.toHaveBeenCalled();
    expect(showError).toHaveBeenCalledWith('autoWizard.toast.dataIncomplete', 'auto-wizard');
  });

  it('reports running while it waits for the data and stops reporting it afterwards', async () => {
    // Arrange
    let resolveLoad: (outcome: string) => void = () => undefined;
    const awaitFullyLoaded = vi.fn(() => new Promise((resolve) => { resolveLoad = resolve as (outcome: string) => void; }));
    TestBed.configureTestingModule({
      providers: [
        { provide: CollisionDetectionService, useValue: { errorEntries: signal([]) } },
        { provide: DataAutoWizardService, useValue: { status: signal('idle'), start: vi.fn() } as unknown as DataAutoWizardService },
        { provide: DataManagementScheduleService, useValue: buildScheduleStub(new Date(2026, 5, 1), new Date(2026, 5, 7)) },
        { provide: AnalyseScenarioService, useValue: { activeToken: () => null } as unknown as AnalyseScenarioService },
        { provide: ToastShowService, useValue: { showError: vi.fn(), showInfo: vi.fn() } as unknown as ToastShowService },
        { provide: TranslateService, useValue: buildTranslateStub(vi.fn((key: string) => key)) },
        { provide: ScheduleLoadCompletionService, useValue: { awaitFullyLoaded } },
      ],
    });
    const orchestrator = TestBed.inject(AutoWizardOrchestratorService);

    // Act
    const pending = orchestrator.start();
    const runningWhileWaiting = orchestrator.isRunning();
    void orchestrator.start();
    resolveLoad(SCHEDULE_LOAD_OUTCOME.Stalled);
    await pending;

    // Assert
    expect(runningWhileWaiting).toBe(true);
    expect(awaitFullyLoaded).toHaveBeenCalledTimes(1);
    expect(orchestrator.isRunning()).toBe(false);
  });
});

describe('AutoWizardOrchestratorService bound to the group and period of the click', () => {
  const JOB_GROUP = 'g1';
  const OTHER_GROUP = 'g2';
  const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

  interface WizardStub {
    status: WritableSignal<string>;
    result: WritableSignal<unknown>;
    failureReason: WritableSignal<string | null>;
    partialResult: WritableSignal<unknown>;
    start: Mock;
    resume: Mock;
  }

  interface ScheduleStub {
    workFilter: { selectedGroup: string | undefined };
    periodStartDate: Date;
    readDatas: Mock;
  }

  interface Harness {
    orchestrator: AutoWizardOrchestratorService;
    schedule: ScheduleStub;
    wizard: WizardStub;
    selectScenario: Mock;
    showInfo: Mock;
    showError: Mock;
    instant: Mock;
  }

  function setup(options: { awaitFullyLoaded?: () => Promise<unknown>; resume?: Mock } = {}): Harness {
    selectedGroupId.set(JOB_GROUP);
    const schedule = {
      periodStartDate: new Date(2026, 5, 1),
      periodEndDate: new Date(2026, 5, 7),
      clients: [{ id: 'agent-1' }],
      shiftSchedules: [{ shiftId: 'shift-1' }],
      workFilter: { selectedGroup: JOB_GROUP as string | undefined },
      isIndividualClientSortActive: false,
      isRead: signal({ count: 0, resetScroll: false }),
      readDatas: vi.fn(),
    };
    const wizard: WizardStub = {
      status: signal('idle'),
      result: signal<unknown>(null),
      failureReason: signal<string | null>(null),
      partialResult: signal<unknown>(null),
      start: vi.fn().mockResolvedValue('job-1'),
      resume: options.resume ?? vi.fn().mockResolvedValue(false),
    };
    const selectScenario = vi.fn();
    const showInfo = vi.fn();
    const showError = vi.fn();
    const instant = vi.fn((key: string, _params?: object) => key);
    TestBed.configureTestingModule({
      providers: [
        { provide: CollisionDetectionService, useValue: { errorEntries: signal([]) } },
        { provide: DataAutoWizardService, useValue: wizard },
        { provide: DataManagementScheduleService, useValue: schedule },
        {
          provide: AnalyseScenarioService,
          useValue: { activeToken: () => null, scenarios: signal([]), selectScenario },
        },
        { provide: ToastShowService, useValue: { showError, showInfo } },
        { provide: TranslateService, useValue: buildTranslateStub(instant) },
        {
          provide: ScheduleLoadCompletionService,
          useValue: {
            awaitFullyLoaded: options.awaitFullyLoaded ?? vi.fn().mockResolvedValue(SCHEDULE_LOAD_OUTCOME.Complete),
          },
        },
      ],
    });
    const orchestrator = TestBed.inject(AutoWizardOrchestratorService);
    return { orchestrator, schedule, wizard, selectScenario, showInfo, showError, instant };
  }

  function deferredLoad(): { awaitFullyLoaded: () => Promise<unknown>; resolve: (outcome: string) => void } {
    let resolveLoad: (outcome: string) => void = () => undefined;
    return {
      awaitFullyLoaded: () => new Promise((resolve) => { resolveLoad = resolve as (outcome: string) => void; }),
      resolve: (outcome: string) => resolveLoad(outcome),
    };
  }

  function complete(h: Harness): void {
    h.wizard.result.set({
      jobId: 'job-1',
      finalScenarioId: 'scenario-1',
      finalScenarioToken: 'token-1',
      finalScenarioName: 'Auto Plan',
      elapsedMs: 1,
    });
    h.wizard.status.set('completed');
    TestBed.tick();
  }

  function paramsOf(h: Harness, key: string): Record<string, unknown> | undefined {
    return h.instant.mock.calls.find(([k]) => k === key)?.[1] as Record<string, unknown> | undefined;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('does not start when the group changes while the schedule is still loading', async () => {
    // Arrange
    const load = deferredLoad();
    const h = setup({ awaitFullyLoaded: load.awaitFullyLoaded });

    // Act
    const pending = h.orchestrator.start();
    h.schedule.workFilter.selectedGroup = OTHER_GROUP;
    load.resolve(SCHEDULE_LOAD_OUTCOME.Complete);
    await pending;

    // Assert
    expect(h.wizard.start).not.toHaveBeenCalled();
    expect(h.showError).toHaveBeenCalledWith('autoWizard.toast.scopeChanged', 'auto-wizard');
    expect(h.orchestrator.isRunning()).toBe(false);
  });

  it('does not start when the period changes while the schedule is still loading', async () => {
    // Arrange
    const load = deferredLoad();
    const h = setup({ awaitFullyLoaded: load.awaitFullyLoaded });

    // Act
    const pending = h.orchestrator.start();
    h.schedule.periodStartDate = new Date(2026, 6, 1);
    load.resolve(SCHEDULE_LOAD_OUTCOME.Complete);
    await pending;

    // Assert
    expect(h.wizard.start).not.toHaveBeenCalled();
    expect(h.showError).toHaveBeenCalledWith('autoWizard.toast.scopeChanged', 'auto-wizard');
  });

  it('sends the captured group and period and persists the job for a reload', async () => {
    // Arrange
    const h = setup();

    // Act
    await h.orchestrator.start();

    // Assert
    expect(h.wizard.start).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: JOB_GROUP, periodFrom: '2026-06-01', periodUntil: '2026-06-07' }),
    );
    const stored = JSON.parse(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB) ?? '{}');
    expect(stored).toEqual(expect.objectContaining({ jobId: 'job-1', groupId: JOB_GROUP, groupName: 'Name-g1' }));
  });

  it('shows the spinner only on the group the run belongs to', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();
    h.wizard.status.set('running');

    // Act
    const onJobGroup = h.orchestrator.isRunningForCurrentGroup();
    selectedGroupId.set(OTHER_GROUP);

    // Assert
    expect(onJobGroup).toBe(true);
    expect(h.orchestrator.isRunningForCurrentGroup()).toBe(false);
    expect(h.orchestrator.runningElsewhereGroupName()).toBe('Name-g1');
    expect(h.orchestrator.isRunning()).toBe(true);
  });

  it('opens the scenario right away when the planner still looks at the job group', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();

    // Act
    complete(h);

    // Assert
    expect(h.selectScenario).toHaveBeenCalledWith(expect.objectContaining({ id: 'scenario-1', groupId: JOB_GROUP }));
    expect(h.schedule.readDatas).toHaveBeenCalled();
    expect(h.showInfo).toHaveBeenCalledWith('autoWizard.toast.completed', 'auto-wizard', '', expect.anything());
    expect(h.orchestrator.isRunning()).toBe(false);
    expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB)).toBeNull();
  });

  it('warns once about skipped invalid planning rules, apart from the completion notice', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();
    const warning = {
      type: 'warning',
      clientId: '00000000-0000-0000-0000-000000000000',
      clientName: '',
      date: '2026-06-01',
      comment: 'schedule.error-list.planning-rule-invalid',
      commentParams: { ruleId: 'rule-1' },
    };

    // Act
    h.wizard.result.set({
      jobId: 'job-1',
      finalScenarioId: 'scenario-1',
      finalScenarioToken: 'token-1',
      finalScenarioName: 'Auto Plan',
      elapsedMs: 1,
      planningRuleWarnings: [warning, { ...warning, commentParams: { ruleId: 'rule-2' } }],
    });
    h.wizard.status.set('completed');
    TestBed.tick();

    // Assert
    expect(h.showInfo).toHaveBeenCalledWith('autoWizard.toast.completed', 'auto-wizard', '', expect.anything());
    expect(h.showError).toHaveBeenCalledTimes(1);
    expect(h.showError).toHaveBeenCalledWith(
      'schedule.error-list.planning-rule-invalid',
      'auto-wizard',
      '',
      expect.anything(),
    );
  });

  it('reports the remaining hard rule violations with both counts, without calling them pre-existing', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();

    // Act
    h.wizard.result.set({
      jobId: 'job-1',
      finalScenarioId: 'scenario-1',
      finalScenarioToken: 'token-1',
      finalScenarioName: 'Auto Plan',
      elapsedMs: 1,
      planningRuleRemaining: { hardBefore: 3, hardAfter: 2 },
    });
    h.wizard.status.set('completed');
    TestBed.tick();

    // Assert
    expect(h.showError).toHaveBeenCalledTimes(1);
    expect(h.showError).toHaveBeenCalledWith(
      'schedule.planning-rule-remaining.counts',
      'auto-wizard',
      '',
      expect.anything(),
    );
  });

  it('warns that the run added hard rule violations when the count rose', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();

    // Act
    h.wizard.result.set({
      jobId: 'job-1',
      finalScenarioId: 'scenario-1',
      finalScenarioToken: 'token-1',
      finalScenarioName: 'Auto Plan',
      elapsedMs: 1,
      planningRuleRemaining: { hardBefore: 1, hardAfter: 2 },
    });
    h.wizard.status.set('completed');
    TestBed.tick();

    // Assert
    expect(h.showError).toHaveBeenCalledWith(
      'schedule.planning-rule-remaining.added',
      'auto-wizard',
      '',
      expect.anything(),
    );
  });

  it('shows no planning-rule warning when the run skipped no rule', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();

    // Act
    complete(h);

    // Assert
    expect(h.showError).not.toHaveBeenCalled();
  });

  it('announces a result for another group by name and opens it once that group is shown', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();
    selectedGroupId.set(OTHER_GROUP);

    // Act
    complete(h);
    const selectedWhileAway = h.selectScenario.mock.calls.length;
    const reloadsWhileAway = h.schedule.readDatas.mock.calls.length;
    selectedGroupId.set(JOB_GROUP);
    TestBed.tick();
    selectedGroupId.set(OTHER_GROUP);
    TestBed.tick();
    selectedGroupId.set(JOB_GROUP);
    TestBed.tick();

    // Assert
    expect(selectedWhileAway).toBe(0);
    expect(reloadsWhileAway).toBe(0);
    expect(paramsOf(h, 'autoWizard.toast.completedForGroup')).toEqual({ group: 'Name-g1', scenario: 'Auto Plan' });
    expect(h.selectScenario).toHaveBeenCalledTimes(1);
    expect(h.selectScenario).toHaveBeenCalledWith(expect.objectContaining({ id: 'scenario-1', token: 'token-1' }));
    expect(h.schedule.readDatas).toHaveBeenCalledTimes(1);
  });

  it('opens a result that ended while another page was shown once the schedule is visible again', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();
    visibleEntity.set(EntityName.CLIENT);

    // Act
    complete(h);
    const selectedWhileAway = h.selectScenario.mock.calls.length;
    visibleEntity.set(EntityName.SCHEDULE);
    TestBed.tick();

    // Assert
    expect(selectedWhileAway).toBe(0);
    expect(paramsOf(h, 'autoWizard.toast.completedForGroup')).toEqual({ group: 'Name-g1', scenario: 'Auto Plan' });
    expect(h.selectScenario).toHaveBeenCalledTimes(1);
  });

  it('reports a failure for another group by name without reloading the shown schedule', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();
    selectedGroupId.set(OTHER_GROUP);

    // Act
    h.wizard.failureReason.set('model unreachable');
    h.wizard.partialResult.set({
      jobId: 'job-1',
      failedStage: 'HolisticHarmonizer',
      reason: 'model unreachable',
      partialScenarioId: 'scenario-2',
      partialScenarioToken: 'token-2',
      partialScenarioName: 'Auto Harmonizer',
    });
    h.wizard.status.set('failed');
    TestBed.tick();
    const reloadsWhileAway = h.schedule.readDatas.mock.calls.length;
    selectedGroupId.set(JOB_GROUP);
    TestBed.tick();

    // Assert
    expect(paramsOf(h, 'autoWizard.toast.failedForGroup')).toEqual({ group: 'Name-g1', reason: 'model unreachable' });
    expect(reloadsWhileAway).toBe(0);
    expect(h.orchestrator.isRunning()).toBe(false);
    expect(h.selectScenario).toHaveBeenCalledWith(expect.objectContaining({ id: 'scenario-2' }));
  });

  it('keeps the failure and the surviving partial scenario in one toast', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();
    selectedGroupId.set(OTHER_GROUP);

    // Act
    h.wizard.failureReason.set('model unreachable');
    h.wizard.partialResult.set({
      jobId: 'job-1',
      failedStage: 'HolisticHarmonizer',
      reason: 'model unreachable',
      partialScenarioId: 'scenario-2',
      partialScenarioToken: 'token-2',
      partialScenarioName: 'Auto Harmonizer',
    });
    h.wizard.status.set('failed');
    TestBed.tick();

    // Assert
    expect(h.showInfo.mock.calls.some(([message]) => String(message).includes('partialResult'))).toBe(false);
    expect(h.showError).toHaveBeenCalledTimes(1);
    expect(h.showError.mock.calls[0][0]).toBe('autoWizard.toast.failedForGroup autoWizard.toast.partialResult');
  });

  it('ends the run even when opening the scenario throws', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();
    h.selectScenario.mockImplementation(() => {
      throw new Error('render failure');
    });

    // Act
    try {
      complete(h);
    } catch {
      // The effect rethrows through TestBed.tick; the run must be closed regardless.
    }

    // Assert
    expect(h.wizard.status()).toBe('idle');
    expect(h.orchestrator.isRunning()).toBe(false);
    expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB)).toBeNull();
  });

  it('ends the run even when the failure toast throws', async () => {
    // Arrange
    const h = setup();
    await h.orchestrator.start();
    h.showError.mockImplementation(() => {
      throw new Error('toast failure');
    });

    // Act
    h.wizard.failureReason.set('boom');
    h.wizard.status.set('failed');
    try {
      TestBed.tick();
    } catch {
      // The effect rethrows through TestBed.tick; the run must be closed regardless.
    }

    // Assert
    expect(h.wizard.status()).toBe('idle');
    expect(h.orchestrator.isRunning()).toBe(false);
  });

  describe('after a page reload', () => {
    const STORED_JOB = {
      jobId: 'job-7',
      groupId: JOB_GROUP,
      groupName: 'Stored group',
      periodFrom: '2026-06-01',
      periodUntil: '2026-06-07',
    };

    it('re-attaches to a job the server still runs and shows its spinner on that group', async () => {
      // Arrange
      sessionStorage.setItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB, JSON.stringify(STORED_JOB));
      const resume = vi.fn().mockResolvedValue(true);

      // Act
      const h = setup({ resume });
      await flush();

      // Assert
      expect(resume).toHaveBeenCalledWith('job-7');
      expect(h.orchestrator.isRunningForCurrentGroup()).toBe(true);
      expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB)).not.toBeNull();
    });

    it('handles a job that finished in the meantime like a result for another page', async () => {
      // Arrange
      sessionStorage.setItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB, JSON.stringify(STORED_JOB));
      visibleEntity.set(EntityName.DASHBOARD);
      const ref: { harness?: Harness } = {};
      const resume = vi.fn(async () => {
        await Promise.resolve();
        ref.harness?.wizard.result.set({
          jobId: 'job-7',
          finalScenarioId: 'scenario-7',
          finalScenarioToken: 'token-7',
          finalScenarioName: 'Auto Plan',
          elapsedMs: 1,
        });
        ref.harness?.wizard.status.set('completed');
        return true;
      });

      // Act
      const harness = setup({ resume });
      ref.harness = harness;
      await flush();
      TestBed.tick();
      const storedAfterCompletion = sessionStorage.getItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB);
      visibleEntity.set(EntityName.SCHEDULE);
      TestBed.tick();

      // Assert
      expect(paramsOf(harness, 'autoWizard.toast.completedForGroup')).toEqual({ group: 'Stored group', scenario: 'Auto Plan' });
      expect(storedAfterCompletion).toBeNull();
      expect(harness.selectScenario).toHaveBeenCalledWith(expect.objectContaining({ id: 'scenario-7' }));
    });

    it('forgets a job the server no longer knows without a toast', async () => {
      // Arrange
      sessionStorage.setItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB, JSON.stringify(STORED_JOB));
      const resume = vi.fn().mockResolvedValue(false);

      // Act
      const h = setup({ resume });
      await flush();

      // Assert
      expect(h.orchestrator.isRunning()).toBe(false);
      expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB)).toBeNull();
      expect(h.showError).not.toHaveBeenCalled();
      expect(h.showInfo).not.toHaveBeenCalled();
    });

    it('drops a corrupt stored job without asking the server', async () => {
      // Arrange
      sessionStorage.setItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB, '{"jobId":42');
      const resume = vi.fn();

      // Act
      const h = setup({ resume });
      await flush();

      // Assert
      expect(resume).not.toHaveBeenCalled();
      expect(h.orchestrator.isRunning()).toBe(false);
      expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB)).toBeNull();
    });
  });
});
