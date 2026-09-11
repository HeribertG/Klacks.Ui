// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AutoWizardOrchestratorService } from './auto-wizard-orchestrator.service';
import { DataAutoWizardService } from 'src/app/infrastructure/api/auto-wizard/data-auto-wizard.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { useTimeZone } from 'src/app/shared/testing/time-zone.testing';

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
      {
        provide: DataAutoWizardService,
        useValue: { status: signal('idle'), start: vi.fn().mockResolvedValue('job-1') } as unknown as DataAutoWizardService,
      },
      { provide: DataManagementScheduleService, useValue: buildScheduleStub(startDate, endDate) },
      { provide: AnalyseScenarioService, useValue: { activeToken: () => null } as unknown as AnalyseScenarioService },
      { provide: ToastShowService, useValue: { showError: vi.fn(), showInfo: vi.fn() } as unknown as ToastShowService },
      { provide: TranslateService, useValue: buildTranslateStub(instant) },
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
      const days = await runExceedsLimits(new Date(2026, 2, 28), new Date(2026, 2, 30));
      expect(days).toBe(3);
    });
  });

  describe('America/New_York spring-forward (2026-03-08)', () => {
    useTimeZone('America/New_York');

    it('counts 3 calendar days for 2026-03-07..2026-03-09', async () => {
      const days = await runExceedsLimits(new Date(2026, 2, 7), new Date(2026, 2, 9));
      expect(days).toBe(3);
    });
  });
});
