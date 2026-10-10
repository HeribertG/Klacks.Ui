// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Keeps the AutoWizard run bound to the group and period it was started for, so switching page or
 * group while it runs neither shows its spinner on the wrong group nor drops its result. Survives a
 * page reload of the same tab through sessionStorage (running job and missed result alike) and
 * opens a result the planner missed once the schedule of its group and period is shown again.
 * @param activeJob - Scope of the run in progress (null = none)
 * @param pendingScenarios - Results waiting for the planner to show their group and period, newest one per group
 * @param isRunningForCurrentGroup - True while a run exists for the currently selected group
 * @param isRunningForCurrentView - True while a run exists for the shown group AND the shown period
 * @param runningElsewhereGroupName - Group name of a run for another group than the selected one
 */

import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { ENTITY_STATE_PROVIDER_TOKEN } from 'src/app/domain/interfaces/entity-state-provider.interface';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { AnalyseScenarioStatus, IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { AutoWizardJobContext } from './auto-wizard-job-context.interface';
import { AutoWizardPendingScenario } from './auto-wizard-pending-scenario.interface';

const NO_GROUP_NAME_KEY = 'autoWizard.group.none';

@Injectable({ providedIn: 'root' })
export class AutoWizardJobTrackerService {
  private readonly groupSelection = inject(GroupSelectionService);
  private readonly entityState = inject(ENTITY_STATE_PROVIDER_TOKEN);
  private readonly analyseScenarioService = inject(AnalyseScenarioService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);
  private readonly translateService = inject(TranslateService);

  private readonly _activeJob = signal<AutoWizardJobContext | null>(null);
  private readonly _pendingScenarios = signal<AutoWizardPendingScenario[]>([]);

  readonly activeJob = this._activeJob.asReadonly();
  readonly pendingScenarios = this._pendingScenarios.asReadonly();

  private readonly currentGroupId = computed(() => this.groupSelection.selectedGroupId ?? null);
  private readonly isScheduleVisible = computed(
    () => this.entityState.nameOfVisibleEntity() === EntityName.SCHEDULE,
  );

  readonly isRunningForCurrentGroup = computed(() => {
    const job = this._activeJob();
    return job !== null && job.groupId === this.currentGroupId();
  });

  readonly isRunningForCurrentView = computed(() => {
    const job = this._activeJob();
    this.dataManagementSchedule.isRead();
    return job !== null && this.isShowing(job.groupId, job.periodFrom, job.periodUntil);
  });

  readonly runningElsewhereGroupName = computed(() => {
    const job = this._activeJob();
    return job !== null && job.groupId !== this.currentGroupId() ? job.groupName : null;
  });

  constructor() {
    this._pendingScenarios.set(this.readPendingStorage());
    effect(() => {
      const pendings = this._pendingScenarios();
      this.dataManagementSchedule.isRead();
      if (pendings.length === 0 || !this.isScheduleVisible()) {
        return;
      }
      this.currentGroupId();
      untracked(() => {
        const pending = pendings.find((p) => this.isShowing(p.groupId, p.periodFrom, p.periodUntil));
        if (!pending) {
          return;
        }
        this.storePending(pendings.filter((p) => p !== pending));
        this.showScenario(pending);
      });
    });
  }

  currentGroupName(): string {
    return this.groupSelection.selectedGroup?.name || this.translateService.instant(NO_GROUP_NAME_KEY);
  }

  currentPeriod(): { periodFrom: string; periodUntil: string } {
    const startDate = this.dataManagementSchedule.periodStartDate;
    const endDate = this.dataManagementSchedule.periodEndDate;
    return {
      periodFrom: startDate ? formatDateOnly(startDate) : '',
      periodUntil: endDate ? formatDateOnly(endDate) : '',
    };
  }

  isShowing(groupId: string | null, periodFrom: string, periodUntil: string): boolean {
    if (!this.isScheduleVisible() || this.currentGroupId() !== groupId) {
      return false;
    }
    const current = this.currentPeriod();
    return current.periodFrom === periodFrom && current.periodUntil === periodUntil;
  }

  begin(context: AutoWizardJobContext): void {
    this._activeJob.set(context);
  }

  attachJobId(jobId: string): void {
    const job = this._activeJob();
    if (!job) {
      return;
    }
    const withId = { ...job, jobId };
    this._activeJob.set(withId);
    this.writeStorage(StorageKeys.AUTO_WIZARD_ACTIVE_JOB, withId);
  }

  reset(): void {
    this.finish();
    this.storePending([]);
  }

  finish(): void {
    this._activeJob.set(null);
    this.removeStorage(StorageKeys.AUTO_WIZARD_ACTIVE_JOB);
  }

  restore(): AutoWizardJobContext | null {
    const stored = this.readStorage(StorageKeys.AUTO_WIZARD_ACTIVE_JOB, (v) => this.isJobContext(v));
    if (!stored) {
      this.removeStorage(StorageKeys.AUTO_WIZARD_ACTIVE_JOB);
      return null;
    }
    this._activeJob.set(stored);
    return stored;
  }

  setPending(scenario: AutoWizardPendingScenario): void {
    this.storePending([
      ...this._pendingScenarios().filter((p) => p.groupId !== scenario.groupId),
      scenario,
    ]);
  }

  showScenario(pending: AutoWizardPendingScenario): void {
    const scenario: IAnalyseScenario = {
      id: pending.scenarioId,
      name: pending.name,
      token: pending.token,
      groupId: pending.groupId ?? undefined,
      fromDate: '',
      untilDate: '',
      createdByUser: '',
      status: AnalyseScenarioStatus.Active,
    };
    this.analyseScenarioService.scenarios.update((list) =>
      list.some((s) => s.id === scenario.id) ? list : [...list, scenario],
    );
    this.analyseScenarioService.selectScenario(scenario);
    this.dataManagementSchedule.readDatas();
  }

  private storePending(pendings: AutoWizardPendingScenario[]): void {
    this._pendingScenarios.set(pendings);
    if (pendings.length === 0) {
      this.removeStorage(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO);
    } else {
      this.writeStorage(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO, pendings);
    }
  }

  private readPendingStorage(): AutoWizardPendingScenario[] {
    const stored = this.readStorage(
      StorageKeys.AUTO_WIZARD_PENDING_SCENARIO,
      (v): v is AutoWizardPendingScenario[] => Array.isArray(v) && v.every((p) => this.isPendingScenario(p)),
    );
    if (!stored) {
      this.removeStorage(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO);
    }
    return stored ?? [];
  }

  private readStorage<T>(key: string, isValid: (value: unknown) => value is T): T | null {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: object): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }

  private removeStorage(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      return;
    }
  }

  private isPendingScenario(value: unknown): value is AutoWizardPendingScenario {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const v = value as Record<string, unknown>;
    return (
      (typeof v['groupId'] === 'string' || v['groupId'] === null) &&
      typeof v['periodFrom'] === 'string' &&
      typeof v['periodUntil'] === 'string' &&
      typeof v['scenarioId'] === 'string' &&
      typeof v['token'] === 'string' &&
      typeof v['name'] === 'string'
    );
  }

  private isJobContext(value: unknown): value is AutoWizardJobContext {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const v = value as Record<string, unknown>;
    return (
      typeof v['jobId'] === 'string' &&
      (typeof v['groupId'] === 'string' || v['groupId'] === null) &&
      typeof v['groupName'] === 'string' &&
      typeof v['periodFrom'] === 'string' &&
      typeof v['periodUntil'] === 'string'
    );
  }
}
