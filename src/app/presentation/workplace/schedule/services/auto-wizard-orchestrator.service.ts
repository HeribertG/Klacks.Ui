// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Orchestrates the AutoWizard button flow: precheck against the mirrored backend
 * limits, job start, and completion/failure handling (scenario registration,
 * schedule reload, toasts). Extracted from ScheduleHeaderComponent so the header
 * only binds the click and the running state. The run is bound to the group and period of the
 * click: a result for a group the planner is not looking at is announced by name and opened once
 * that group's schedule is shown; a run started before a page reload is re-attached.
 * @param isRunning - True while any run exists (waiting for the schedule data or running on the server)
 * @param isRunningForCurrentGroup - True while the run belongs to the currently selected group
 * @param runningElsewhereGroupName - Group name of a run that belongs to another group, else null
 */

import { Injectable, computed, effect, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DataAutoWizardService } from 'src/app/infrastructure/api/auto-wizard/data-auto-wizard.service';
import { AUTO_WIZARD_LIMITS } from 'src/app/infrastructure/api/auto-wizard/auto-wizard-limits.constants';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleLoadCompletionService } from 'src/app/domain/services/schedule/schedule-load-completion.service';
import { SCHEDULE_LOAD_OUTCOME } from 'src/app/domain/constants/schedule-load-completion.constants';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { getDayIndex } from 'src/app/shared/helpers/date.helper';
import { AutoWizardJobTrackerService } from './auto-wizard-job-tracker.service';
import { AutoWizardJobContext } from './auto-wizard-job-context.interface';
import { AutoWizardPendingScenario } from './auto-wizard-pending-scenario.interface';
import { SCHEDULE_VALIDATION_KEY_PLANNING_RULE_INVALID } from 'src/app/domain/constants/schedule-validation-keys.constants';
import { CollisionDetectionService } from 'src/app/domain/services/schedule/collision-detection.service';
import { PlanningRulePreExistingService } from 'src/app/domain/services/schedule/planning-rule-pre-existing.service';
import { describePlanningRuleRemaining } from 'src/app/domain/helpers/planning-rule-remaining.helper';

const TOAST_CONTEXT = 'auto-wizard';

@Injectable({ providedIn: 'root' })
export class AutoWizardOrchestratorService {
  private readonly dataAutoWizardService = inject(DataAutoWizardService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);
  private readonly analyseScenarioService = inject(AnalyseScenarioService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);
  private readonly scheduleLoadCompletion = inject(ScheduleLoadCompletionService);
  private readonly tracker = inject(AutoWizardJobTrackerService);
  private readonly collisionService = inject(CollisionDetectionService);
  private readonly planningRulePreExisting = inject(PlanningRulePreExistingService);

  readonly isRunning = computed(
    () => this.tracker.activeJob() !== null || this.dataAutoWizardService.status() === 'running',
  );
  readonly isRunningForCurrentGroup = this.tracker.isRunningForCurrentGroup;
  readonly runningElsewhereGroupName = this.tracker.runningElsewhereGroupName;

  constructor() {
    effect(() => {
      const status = this.dataAutoWizardService.status();
      if (status === 'completed') {
        this.handleCompleted();
      } else if (status === 'failed') {
        this.handleFailed();
      }
    });
    void this.resumePersistedJob();
  }

  async start(): Promise<void> {
    if (this.isRunning()) return;

    const scope = this.captureScope();
    this.tracker.begin(scope);
    let requestSent = false;
    try {
      requestSent = await this.prepareAndStart(scope);
    } finally {
      if (!requestSent) {
        this.tracker.finish();
      }
    }
  }

  private captureScope(): AutoWizardJobContext {
    return {
      jobId: null,
      groupId: this.dataManagementSchedule.workFilter.selectedGroup ?? null,
      groupName: this.tracker.currentGroupName(),
      ...this.tracker.currentPeriod(),
    };
  }

  private isShowingJob(job: AutoWizardJobContext | null): boolean {
    return !job || this.tracker.isShowing(job.groupId, job.periodFrom, job.periodUntil);
  }

  private async resumePersistedJob(): Promise<void> {
    const context = this.tracker.restore();
    if (!context?.jobId) {
      return;
    }
    const tracked = await this.dataAutoWizardService.resume(context.jobId);
    if (!tracked) {
      this.tracker.finish();
    }
  }

  private async prepareAndStart(scope: AutoWizardJobContext): Promise<boolean> {
    const outcome = await this.scheduleLoadCompletion.awaitFullyLoaded();

    const current = this.captureScope();
    if (
      current.groupId !== scope.groupId ||
      current.periodFrom !== scope.periodFrom ||
      current.periodUntil !== scope.periodUntil
    ) {
      this.showError('autoWizard.toast.scopeChanged');
      return false;
    }

    if (outcome !== SCHEDULE_LOAD_OUTCOME.Complete) {
      this.showError('autoWizard.toast.dataIncomplete');
      return false;
    }

    const startDate = this.dataManagementSchedule.periodStartDate;
    const endDate = this.dataManagementSchedule.periodEndDate;
    if (!startDate || !endDate) {
      this.showError('autoWizard.toast.noPeriod');
      return false;
    }

    const agentIds = this.dataManagementSchedule.clients
      .map((c) => c.id)
      .filter((id): id is string => !!id);
    if (agentIds.length === 0) {
      this.showError('autoWizard.toast.noAgents');
      return false;
    }

    const shiftIds = [
      ...new Set(
        this.dataManagementSchedule.shiftSchedules.map((s) => s.shiftId),
      ),
    ];
    if (shiftIds.length === 0) {
      this.showError('autoWizard.toast.noShifts');
      return false;
    }

    if (this.exceedsLimits(agentIds.length, shiftIds.length, startDate, endDate)) {
      return false;
    }

    this.planningRulePreExisting.captureBeforeRun(
      this.collisionService.errorEntries(),
      this.dataAutoWizardService.result,
    );
    try {
      const jobId = await this.dataAutoWizardService.start({
        periodFrom: scope.periodFrom,
        periodUntil: scope.periodUntil,
        agentIds,
        shiftIds,
        groupId: scope.groupId,
        analyseToken: this.analyseScenarioService.activeToken(),
        language: this.translateService.currentLang ?? null,
        agentOrderIsUserDefined: this.dataManagementSchedule.isIndividualClientSortActive,
      });
      this.tracker.attachJobId(jobId);
      this.toastShowService.showInfo(
        this.translateService.instant('autoWizard.toast.started'),
        TOAST_CONTEXT,
        '',
        TOAST_ICONS.INFO,
      );
    } catch {
      // Failure handled via the status effect.
    }
    return true;
  }

  private showError(key: string): void {
    this.toastShowService.showError(this.translateService.instant(key), TOAST_CONTEXT);
  }

  private exceedsLimits(agents: number, shifts: number, startDate: Date, endDate: Date): boolean {
    const periodDays = Math.max(1, getDayIndex(startDate, endDate) + 1);
    const slotProduct = agents * Math.max(1, shifts) * periodDays;
    if (
      agents <= AUTO_WIZARD_LIMITS.maxAgents &&
      shifts <= AUTO_WIZARD_LIMITS.maxShifts &&
      slotProduct <= AUTO_WIZARD_LIMITS.maxSlotProduct
    ) {
      return false;
    }

    this.toastShowService.showError(
      this.translateService.instant('autoWizard.toast.tooLarge', {
        agents,
        shifts,
        days: periodDays,
        maxAgents: AUTO_WIZARD_LIMITS.maxAgents,
        maxShifts: AUTO_WIZARD_LIMITS.maxShifts,
        maxSlotProduct: AUTO_WIZARD_LIMITS.maxSlotProduct,
      }),
      TOAST_CONTEXT,
    );
    return true;
  }

  private handleCompleted(): void {
    try {
      this.announceCompleted();
    } finally {
      this.tracker.finish();
      this.dataAutoWizardService.status.set('idle');
    }
  }

  private announceCompleted(): void {
    const job = this.tracker.activeJob();
    const result = this.dataAutoWizardService.result();
    const scenario = this.toPendingScenario(
      job,
      result?.finalScenarioId,
      result?.finalScenarioToken,
      result?.finalScenarioName,
    );

    if (!job || this.isShowingJob(job)) {
      if (scenario) {
        this.tracker.showScenario(scenario);
      }
      this.showInfo(
        this.translateService.instant('autoWizard.toast.completed', {
          scenario: result?.finalScenarioName ?? '',
        }),
      );
    } else {
      if (scenario) {
        this.tracker.setPending(scenario);
      }
      this.showInfo(
        this.translateService.instant('autoWizard.toast.completedForGroup', {
          group: job.groupName,
          scenario: result?.finalScenarioName ?? '',
        }),
      );
    }

    const gapCount = result?.qualificationGaps?.length ?? 0;
    if (gapCount > 0) {
      this.toastShowService.showError(
        this.translateService.instant('autoWizard.toast.qualificationGaps', { count: gapCount }),
        TOAST_CONTEXT,
        '',
        TOAST_ICONS.WARNING,
      );
    }

    if ((result?.planningRuleWarnings?.length ?? 0) > 0) {
      this.toastShowService.showError(
        this.translateService.instant(SCHEDULE_VALIDATION_KEY_PLANNING_RULE_INVALID),
        TOAST_CONTEXT,
        '',
        TOAST_ICONS.WARNING,
      );
    }

    const remaining = describePlanningRuleRemaining(result?.planningRuleRemaining, false);
    if (remaining) {
      this.toastShowService.showError(
        this.translateService.instant(remaining.key, remaining.params),
        TOAST_CONTEXT,
        '',
        TOAST_ICONS.WARNING,
      );
    }
  }

  private handleFailed(): void {
    try {
      this.announceFailed();
    } finally {
      this.tracker.finish();
      this.dataAutoWizardService.status.set('idle');
    }
  }

  private announceFailed(): void {
    const job = this.tracker.activeJob();
    const showingGroup = this.isShowingJob(job);
    const rawReason = (this.dataAutoWizardService.failureReason() ?? '').trim();
    const reason =
      rawReason.length > 0
        ? rawReason
        : this.translateService.instant('autoWizard.toast.failedUnknown');
    const message = !job || showingGroup
      ? this.translateService.instant('autoWizard.toast.failed', { reason })
      : this.translateService.instant('autoWizard.toast.failedForGroup', { group: job.groupName, reason });
    const partial = this.dataAutoWizardService.partialResult();
    const partialNote = partial?.partialScenarioName
      ? ` ${this.translateService.instant('autoWizard.toast.partialResult', { name: partial.partialScenarioName })}`
      : '';
    this.toastShowService.showError(`${message}${partialNote}`, TOAST_CONTEXT);

    if (partial?.partialScenarioName) {
      const scenario = this.toPendingScenario(
        job,
        partial.partialScenarioId,
        partial.partialScenarioToken,
        partial.partialScenarioName,
      );
      if (showingGroup) {
        this.dataManagementSchedule.readDatas();
      } else if (scenario) {
        this.tracker.setPending(scenario);
      }
    }
  }

  private showInfo(message: string): void {
    this.toastShowService.showInfo(message, TOAST_CONTEXT, '', TOAST_ICONS.INFO);
  }

  private toPendingScenario(
    job: AutoWizardJobContext | null,
    scenarioId: string | null | undefined,
    token: string | null | undefined,
    name: string | null | undefined,
  ): AutoWizardPendingScenario | null {
    if (!scenarioId || !token || !name) {
      return null;
    }
    return {
      groupId: job ? job.groupId : this.dataManagementSchedule.workFilter.selectedGroup ?? null,
      periodFrom: job?.periodFrom ?? '',
      periodUntil: job?.periodUntil ?? '',
      scenarioId,
      token,
      name,
    };
  }
}
