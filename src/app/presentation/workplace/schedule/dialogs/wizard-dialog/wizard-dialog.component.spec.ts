// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { WizardDialogComponent } from './wizard-dialog.component';
import { DataWizardService } from 'src/app/infrastructure/api/wizard/data-wizard.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { WizardProgress, WizardResult, WizardStatus } from 'src/app/domain/models/wizard/wizard-progress.model';
import { IClientWork } from 'src/app/domain/models/schedule/schedule-class';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { ScheduleLoadCompletionService } from 'src/app/domain/services/schedule/schedule-load-completion.service';
import { SCHEDULE_LOAD_OUTCOME } from 'src/app/domain/constants/schedule-load-completion.constants';

function createWizardServiceMock() {
  return {
    progress: signal<WizardProgress | null>(null),
    result: signal<WizardResult | null>(null),
    status: signal<WizardStatus>('idle'),
    failureReason: signal<string | null>(null),
    currentJobId: signal<string | null>(null),
    start: vi.fn().mockResolvedValue('job-1'),
    cancel: vi.fn().mockResolvedValue(true),
    apply: vi.fn().mockResolvedValue({
      createdWorkIds: ['work-1', 'work-2'],
      complianceViolations: [],
      skippedPlacements: [],
      overrideApplied: false,
    }),
    applyAsScenario: vi.fn().mockResolvedValue({
      scenarioId: 'scenario-1',
      scenarioToken: 'token-1',
      scenarioName: 'Plan',
      runGroupId: null,
      createdWorkIds: ['work-1'],
      complianceViolations: [],
      skippedPlacements: [],
      overrideApplied: false,
    }),
    stopConnection: vi.fn().mockResolvedValue(undefined),
  };
}

function createScheduleMock() {
  return {
    clients: [] as IClientWork[],
    shiftSchedules: [] as IShiftSchedule[],
    visibleStartDate: new Date('2026-04-01'),
    visibleEndDate: new Date('2026-04-30'),
    readDatas: vi.fn(),
  };
}

describe('WizardDialogComponent', () => {
  let component: WizardDialogComponent;
  let fixture: ComponentFixture<WizardDialogComponent>;
  let wizardServiceMock: ReturnType<typeof createWizardServiceMock>;
  let scheduleMock: ReturnType<typeof createScheduleMock>;
  let analyseScenarioServiceMock: { isScenarioMode: ReturnType<typeof vi.fn> };
  let authorizationServiceMock: { hasPermission: (p: string) => boolean };
  let grantedPermissions: Set<string>;

  beforeEach(async () => {
    wizardServiceMock = createWizardServiceMock();
    scheduleMock = createScheduleMock();
    analyseScenarioServiceMock = {
      isScenarioMode: vi.fn().mockReturnValue(true),
    };
    grantedPermissions = new Set([ROLE_ADMIN]);
    authorizationServiceMock = { hasPermission: (p: string) => grantedPermissions.has(p) };

    await TestBed.configureTestingModule({
      imports: [WizardDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataWizardService, useValue: wizardServiceMock },
        { provide: DataManagementScheduleService, useValue: scheduleMock },
        {
          provide: AnalyseScenarioService,
          useValue: {
            ...analyseScenarioServiceMock,
            activeToken: () => null,
            scenarios: { update: () => {} },
            selectScenario: () => {},
          },
        },
        { provide: AuthorizationService, useValue: authorizationServiceMock },
        { provide: ScheduleLoadCompletionService, useValue: { awaitFullyLoaded: vi.fn().mockResolvedValue(SCHEDULE_LOAD_OUTCOME.Complete) } },
        {
          provide: NgbModal,
          useValue: {
            open: vi.fn().mockReturnValue({
              dismissed: { subscribe: vi.fn() },
              close: vi.fn(),
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WizardDialogComponent);
    component = fixture.componentInstance;
  });

  it('phase is "running" when status is idle (initial state)', () => {
    wizardServiceMock.status.set('idle');
    expect(component.phase()).toBe('running');
  });

  it('phase is "done" when status is completed', () => {
    wizardServiceMock.status.set('completed');
    expect(component.phase()).toBe('done');
  });

  it('phase is "cancelled" when status is cancelled', () => {
    wizardServiceMock.status.set('cancelled');
    expect(component.phase()).toBe('cancelled');
  });

  it('phase is "error" when status is failed', () => {
    wizardServiceMock.status.set('failed');
    expect(component.phase()).toBe('error');
  });

  it('phase is "applying" immediately after onApply is called', () => {
    wizardServiceMock.status.set('completed');
    wizardServiceMock.currentJobId.set('job-1');

    void component.onApply();
    expect(component.phase()).toBe('applying');
  });

  it('appliedCount and phase are updated after successful apply', async () => {
    wizardServiceMock.status.set('completed');
    wizardServiceMock.currentJobId.set('job-1');
    wizardServiceMock.apply.mockResolvedValue({
      createdWorkIds: ['w1', 'w2', 'w3'],
      complianceViolations: [],
      skippedPlacements: [],
      overrideApplied: false,
    });

    await component.onApply();

    expect(component.appliedCount()).toBe(3);
    expect(component.phase()).toBe('applied');
    expect(scheduleMock.readDatas).toHaveBeenCalledTimes(1);
  });

  it('progressPercent is 0 when no progress data', () => {
    wizardServiceMock.progress.set(null);
    expect(component.progressPercent()).toBe(0);
  });

  it('progressPercent calculates correctly from progress signal', () => {
    wizardServiceMock.progress.set({
      jobId: 'job-1',
      generation: 50,
      maxGenerations: 100,
      bestHardViolations: 0,
      bestStage1Completion: 0.8,
      bestStage2Score: 0.7,
      earlyStopping: false,
    });
    expect(component.progressPercent()).toBe(50);
  });

  it('sortedTokenRows resolves names and sorts by date', () => {
    scheduleMock.clients = [
      { id: 'agent-1', name: 'Müller', firstName: 'Hans' } as unknown as IClientWork,
    ];
    scheduleMock.shiftSchedules = [
      { shiftId: 'shift-1', shiftName: 'Frühdienst' } as unknown as IShiftSchedule,
    ];
    wizardServiceMock.result.set({
      jobId: 'job-1',
      finalHardViolations: 0,
      finalStage1Completion: 1.0,
      tokenCount: 2,
      availableShiftSlots: 0,
      tokens: [
        { agentId: 'agent-1', shiftId: 'shift-1', date: '2026-04-22', startTime: '06:00', endTime: '14:00', hours: 8 },
        { agentId: 'agent-1', shiftId: 'shift-1', date: '2026-04-21', startTime: '06:00', endTime: '14:00', hours: 8 },
      ],
    });

    const rows = component.sortedTokenRows();

    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBe('2026-04-21');
    expect(rows[1].date).toBe('2026-04-22');
    expect(rows[0].agentName).toBe('Müller, Hans');
    expect(rows[0].shiftName).toBe('Frühdienst');
  });

  it('sortedTokenRows uses agentId as fallback when client not found', () => {
    scheduleMock.clients = [];
    wizardServiceMock.result.set({
      jobId: 'job-1',
      finalHardViolations: 0,
      finalStage1Completion: 1.0,
      tokenCount: 1,
      availableShiftSlots: 0,
      tokens: [
        { agentId: 'unknown-guid', shiftId: 'shift-1', date: '2026-04-22', startTime: '06:00', endTime: '14:00', hours: 8 },
      ],
    });

    const rows = component.sortedTokenRows();

    expect(rows[0].agentName).toBe('unknown-guid');
  });

  it('phase stays done and applyError is set when onApply rejects', async () => {
    wizardServiceMock.status.set('completed');
    wizardServiceMock.currentJobId.set('job-1');
    wizardServiceMock.apply.mockRejectedValue(new Error('Apply failed'));

    await component.onApply();

    expect(component.phase()).toBe('done');
    expect(component.applyError()).toBe('Apply failed');
  });

  it('onApply is a no-op while an apply is already in flight', async () => {
    wizardServiceMock.status.set('completed');
    wizardServiceMock.currentJobId.set('job-1');
    let resolveApply: (response: {
      createdWorkIds: string[];
      complianceViolations: unknown[];
      skippedPlacements: unknown[];
      overrideApplied: boolean;
    }) => void = () => undefined;
    wizardServiceMock.apply.mockReturnValue(new Promise((resolve) => { resolveApply = resolve; }));

    const first = component.onApply();
    await component.onApply();

    expect(wizardServiceMock.apply).toHaveBeenCalledTimes(1);
    resolveApply({ createdWorkIds: [], complianceViolations: [], skippedPlacements: [], overrideApplied: false });
    await first;
  });

  it('onApply is a no-op when currentJobId is null', async () => {
    wizardServiceMock.currentJobId.set(null);

    await component.onApply();

    expect(wizardServiceMock.apply).not.toHaveBeenCalled();
    expect(component.appliedCount()).toBe(0);
  });

  it('canRetryWithOverride stays false for the Supervisor role, which lacks the Admin-only wizard override right', async () => {
    grantedPermissions = new Set();
    analyseScenarioServiceMock.isScenarioMode.mockReturnValue(true);
    wizardServiceMock.status.set('completed');
    wizardServiceMock.currentJobId.set('job-1');
    wizardServiceMock.apply.mockResolvedValue({
      createdWorkIds: [],
      complianceViolations: [],
      skippedPlacements: [{ clientId: 'agent-1', date: '2026-04-22', shiftId: null, reasonKey: 'schedule.error-list.overtime' }],
      overrideApplied: false,
    });

    await component.onApply();

    expect(component.canRetryWithOverride()).toBe(false);
  });

  it('canRetryWithOverride is true after a full block on the apply() path (isScenarioMode true), which is the only cache-retry-capable backend path', async () => {
    analyseScenarioServiceMock.isScenarioMode.mockReturnValue(true);
    wizardServiceMock.status.set('completed');
    wizardServiceMock.currentJobId.set('job-1');
    wizardServiceMock.apply.mockResolvedValue({
      createdWorkIds: [],
      complianceViolations: [],
      skippedPlacements: [{ clientId: 'agent-1', date: '2026-04-22', shiftId: null, reasonKey: 'schedule.error-list.overtime' }],
      overrideApplied: false,
    });

    await component.onApply();

    expect(component.canRetryWithOverride()).toBe(true);
  });

  it('canRetryWithOverride is false after a full block on the applyAsScenario() path (isScenarioMode false), which never allows a cache retry', async () => {
    analyseScenarioServiceMock.isScenarioMode.mockReturnValue(false);
    wizardServiceMock.status.set('completed');
    wizardServiceMock.currentJobId.set('job-1');
    wizardServiceMock.applyAsScenario.mockResolvedValue({
      scenarioId: 'scenario-1',
      scenarioToken: 'token-1',
      scenarioName: 'Plan',
      runGroupId: null,
      createdWorkIds: [],
      complianceViolations: [],
      skippedPlacements: [{ clientId: 'agent-1', date: '2026-04-22', shiftId: null, reasonKey: 'schedule.error-list.overtime' }],
      overrideApplied: false,
    });

    await component.onApply();

    expect(component.canRetryWithOverride()).toBe(false);
  });

  it('sends the current UI language when applying as a scenario so the server names it in that language', async () => {
    TestBed.inject(TranslateService).use('de');
    Object.assign(scheduleMock, { workFilter: { selectedGroup: 'group-1' } });
    analyseScenarioServiceMock.isScenarioMode.mockReturnValue(false);
    wizardServiceMock.status.set('completed');
    wizardServiceMock.currentJobId.set('job-1');

    await component.onApply();

    expect(wizardServiceMock.applyAsScenario).toHaveBeenCalledWith('job-1', 'group-1', false, 'de');
  });

  describe('start waits for the schedule to finish loading', () => {
    let resolveLoad: (outcome: string) => void;

    beforeEach(() => {
      Object.assign(scheduleMock, {
        periodStartDate: new Date(2026, 3, 1),
        periodEndDate: new Date(2026, 3, 30),
        clients: [{ id: 'agent-1' }] as IClientWork[],
        shiftSchedules: [{ shiftId: 'shift-1' }] as IShiftSchedule[],
      });
      vi.mocked(TestBed.inject(NgbModal).open).mockReturnValue({
        dismissed: new Subject<unknown>(),
        close: vi.fn(),
      } as unknown as NgbModalRef);
      const completion = TestBed.inject(ScheduleLoadCompletionService);
      vi.mocked(completion.awaitFullyLoaded).mockImplementation(
        () => new Promise((resolve) => { resolveLoad = resolve as (outcome: string) => void; }),
      );
      fixture.detectChanges();
    });

    it('starts the run only after loading completed', async () => {
      // Arrange
      component.open();
      const startedBeforeLoad = wizardServiceMock.start.mock.calls.length;

      // Act
      resolveLoad(SCHEDULE_LOAD_OUTCOME.Complete);
      await vi.waitFor(() => expect(wizardServiceMock.start).toHaveBeenCalled());

      // Assert
      expect(startedBeforeLoad).toBe(0);
    });

    it('does not start and shows an error when loading stalled', async () => {
      // Arrange
      component.open();

      // Act
      resolveLoad(SCHEDULE_LOAD_OUTCOME.Stalled);
      await vi.waitFor(() => expect(component.errorMessage()).toBe('wizard.dialog.error.dataIncomplete'));

      // Assert
      expect(wizardServiceMock.start).not.toHaveBeenCalled();
    });

    it('hides the previous result and blocks apply while a retry waits for the data', async () => {
      // Arrange
      wizardServiceMock.status.set('completed');
      wizardServiceMock.currentJobId.set('job-old');

      // Act
      const retry = component.onRetryRun();
      const phaseBeforeStop = component.phase();
      await vi.waitFor(() => expect(wizardServiceMock.stopConnection).toHaveBeenCalled());
      await new Promise((resolve) => setTimeout(resolve, 0));
      const phaseWhileWaiting = component.phase();
      await component.onApply();
      resolveLoad(SCHEDULE_LOAD_OUTCOME.Stalled);
      await retry;

      // Assert
      expect(phaseBeforeStop).toBe('running');
      expect(phaseWhileWaiting).toBe('running');
      expect(wizardServiceMock.apply).not.toHaveBeenCalled();
      expect(wizardServiceMock.applyAsScenario).not.toHaveBeenCalled();
    });

    it('does not start when the dialog was cancelled while waiting', async () => {
      // Arrange
      component.open();
      component.onCancel();

      // Act
      resolveLoad(SCHEDULE_LOAD_OUTCOME.Complete);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      expect(wizardServiceMock.start).not.toHaveBeenCalled();
    });
  });
});
