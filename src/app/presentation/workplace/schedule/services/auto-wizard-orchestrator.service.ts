// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Orchestrates the AutoWizard button flow: precheck against the mirrored backend
 * limits, job start, and completion/failure handling (scenario registration,
 * schedule reload, toasts). Extracted from ScheduleHeaderComponent so the header
 * only binds the click and the running state.
 * @param isRunning - Signal that is true while an orchestrator job is running
 */

import { Injectable, computed, effect, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DataAutoWizardService } from 'src/app/infrastructure/api/auto-wizard/data-auto-wizard.service';
import { AUTO_WIZARD_LIMITS } from 'src/app/infrastructure/api/auto-wizard/auto-wizard-limits.constants';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';

const TOAST_CONTEXT = 'auto-wizard';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AutoWizardOrchestratorService {
  private readonly dataAutoWizardService = inject(DataAutoWizardService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);
  private readonly analyseScenarioService = inject(AnalyseScenarioService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);

  readonly isRunning = computed(
    () => this.dataAutoWizardService.status() === 'running',
  );

  constructor() {
    effect(() => {
      const status = this.dataAutoWizardService.status();
      if (status === 'completed') {
        this.handleCompleted();
      } else if (status === 'failed') {
        this.handleFailed();
      }
    });
  }

  async start(): Promise<void> {
    if (this.isRunning()) return;

    const startDate = this.dataManagementSchedule.periodStartDate;
    const endDate = this.dataManagementSchedule.periodEndDate;
    if (!startDate || !endDate) {
      this.toastShowService.showError(
        this.translateService.instant('autoWizard.toast.noPeriod'),
        TOAST_CONTEXT,
      );
      return;
    }

    const agentIds = this.dataManagementSchedule.clients
      .map((c) => c.id)
      .filter((id): id is string => !!id);
    if (agentIds.length === 0) {
      this.toastShowService.showError(
        this.translateService.instant('autoWizard.toast.noAgents'),
        TOAST_CONTEXT,
      );
      return;
    }

    const shiftIds = [
      ...new Set(
        this.dataManagementSchedule.shiftSchedules.map((s) => s.shiftId),
      ),
    ];
    if (shiftIds.length === 0) {
      this.toastShowService.showError(
        this.translateService.instant('autoWizard.toast.noShifts'),
        TOAST_CONTEXT,
      );
      return;
    }

    if (this.exceedsLimits(agentIds.length, shiftIds.length, startDate, endDate)) {
      return;
    }

    try {
      await this.dataAutoWizardService.start({
        periodFrom: formatDateOnly(startDate),
        periodUntil: formatDateOnly(endDate),
        agentIds,
        shiftIds,
        groupId: this.dataManagementSchedule.workFilter.selectedGroup ?? null,
        analyseToken: this.analyseScenarioService.activeToken(),
        language: this.translateService.currentLang ?? null,
        agentOrderIsUserDefined: this.dataManagementSchedule.isIndividualClientSortActive,
      });
      this.toastShowService.showInfo(
        this.translateService.instant('autoWizard.toast.started'),
        TOAST_CONTEXT,
        '',
        TOAST_ICONS.INFO,
      );
    } catch {
      // Failure handled via the status effect.
    }
  }

  private exceedsLimits(agents: number, shifts: number, startDate: Date, endDate: Date): boolean {
    const periodDays = Math.max(
      1,
      Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1,
    );
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
    const result = this.dataAutoWizardService.result();
    if (
      result?.finalScenarioId &&
      result.finalScenarioToken &&
      result.finalScenarioName
    ) {
      const newScenario = {
        id: result.finalScenarioId,
        name: result.finalScenarioName,
        token: result.finalScenarioToken,
        fromDate: '',
        untilDate: '',
        createdByUser: '',
        status: AnalyseScenarioStatus.Active,
      };
      this.analyseScenarioService.scenarios.update((list) => {
        return list.some((s) => s.id === newScenario.id)
          ? list
          : [...list, newScenario];
      });
      this.analyseScenarioService.selectScenario(newScenario);
      this.dataManagementSchedule.readDatas();
    }
    const message = this.translateService.instant('autoWizard.toast.completed', {
      scenario: result?.finalScenarioName ?? '',
    });
    this.toastShowService.showInfo(message, TOAST_CONTEXT, '', TOAST_ICONS.INFO);
    const gapCount = result?.qualificationGaps?.length ?? 0;
    if (gapCount > 0) {
      this.toastShowService.showError(
        this.translateService.instant('autoWizard.toast.qualificationGaps', { count: gapCount }),
        TOAST_CONTEXT,
        '',
        TOAST_ICONS.WARNING,
      );
    }
    this.dataAutoWizardService.status.set('idle');
  }

  private handleFailed(): void {
    const rawReason = (this.dataAutoWizardService.failureReason() ?? '').trim();
    const reason =
      rawReason.length > 0
        ? rawReason
        : this.translateService.instant('autoWizard.toast.failedUnknown');
    const message = this.translateService.instant('autoWizard.toast.failed', { reason });
    this.toastShowService.showError(message, TOAST_CONTEXT);

    // A later stage failing does not mean the earlier ones produced nothing - point the operator at
    // the scenario that survived and reload the list so it is actually visible.
    const partial = this.dataAutoWizardService.partialResult();
    if (partial?.partialScenarioName) {
      this.toastShowService.showInfo(
        this.translateService.instant('autoWizard.toast.partialResult', {
          name: partial.partialScenarioName,
        }),
        TOAST_CONTEXT,
      );
      this.dataManagementSchedule.readDatas();
    }

    this.dataAutoWizardService.status.set('idle');
  }
}
