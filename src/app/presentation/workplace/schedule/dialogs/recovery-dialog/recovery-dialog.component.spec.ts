// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { RecoveryDialogComponent } from './recovery-dialog.component';
import { DataRecoveryService, ICoverAbsenceOutcome } from 'src/app/infrastructure/api/schedule/data-recovery.service';
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

  const formModel = (): any => (component as any).formModel();

  beforeEach(async () => {
    modalClose = vi.fn();
    modalOpen = vi.fn().mockReturnValue({ close: modalClose });
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
        { provide: DataRecoveryService, useValue: { coverAbsence } },
        { provide: AnalyseScenarioService, useValue: { scenarios, selectScenario } },
        { provide: DataManagementScheduleService, useValue: schedule },
        { provide: ToastShowService, useValue: { showError: vi.fn() } },
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
    }
  });

  it('refuses to submit while the end lies before the start', async () => {
    await component.open({ clientId: 'client-1', date: new Date(2026, 9, 6), untilDate: new Date(2026, 9, 5) });
    (component as any).formModel.update((model: any) => ({ ...model, selectedAbsenceId: SICK_ABSENCE_ID }));

    await component.onSubmit();

    expect(coverAbsence).not.toHaveBeenCalled();
  });
});
