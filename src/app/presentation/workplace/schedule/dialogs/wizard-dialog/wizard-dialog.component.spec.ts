// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { WizardDialogComponent } from './wizard-dialog.component';
import { DataWizardService } from 'src/app/infrastructure/api/wizard/data-wizard.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { WizardProgress, WizardResult, WizardStatus } from 'src/app/domain/models/wizard/wizard-progress.model';
import { IClientWork } from 'src/app/domain/models/schedule/schedule-class';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';

function createWizardServiceMock() {
  return {
    progress: signal<WizardProgress | null>(null),
    result: signal<WizardResult | null>(null),
    status: signal<WizardStatus>('idle'),
    failureReason: signal<string | null>(null),
    currentJobId: signal<string | null>(null),
    start: vi.fn().mockResolvedValue('job-1'),
    cancel: vi.fn().mockResolvedValue(true),
    apply: vi.fn().mockResolvedValue(['work-1', 'work-2']),
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
  let wizardServiceMock: ReturnType<typeof createWizardServiceMock>;
  let scheduleMock: ReturnType<typeof createScheduleMock>;

  beforeEach(async () => {
    wizardServiceMock = createWizardServiceMock();
    scheduleMock = createScheduleMock();

    await TestBed.configureTestingModule({
      imports: [WizardDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataWizardService, useValue: wizardServiceMock },
        { provide: DataManagementScheduleService, useValue: scheduleMock },
        { provide: AnalyseScenarioService, useValue: { isScenarioMode: () => true, activeToken: () => null, scenarios: { update: () => {} }, selectScenario: () => {} } },
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

    const fixture = TestBed.createComponent(WizardDialogComponent);
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
    wizardServiceMock.apply.mockResolvedValue(['w1', 'w2', 'w3']);

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

  it('phase reverts to error and _localError is set when onApply rejects', async () => {
    wizardServiceMock.status.set('completed');
    wizardServiceMock.currentJobId.set('job-1');
    wizardServiceMock.apply.mockRejectedValue(new Error('Apply failed'));

    await component.onApply();

    expect(component.phase()).toBe('error');
    expect(component.errorMessage()).toBe('Apply failed');
  });

  it('onApply is a no-op when currentJobId is null', async () => {
    wizardServiceMock.currentJobId.set(null);

    await component.onApply();

    expect(wizardServiceMock.apply).not.toHaveBeenCalled();
    expect(component.appliedCount()).toBe(0);
  });
});
