// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Side panel that visualises a running AgentPlan: each step as a row with status icon
 * (pending / running / done / failed / paused), the skill name, and inline Approve/Abort
 * buttons while the plan is still active or paused for HITL approval.
 * @param approveRequested - Emits the planId when the user clicks Approve on the paused step
 * @param abortRequested - Emits the planId when the user clicks Abort on the running/paused plan
 */

import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementAgentPlanService } from 'src/app/domain/services/assistant/data-management-agent-plan.service';
import {
  IAgentPlanStep,
  PlanStatus,
  PlanStatusValue,
} from 'src/app/domain/models/assistant/agent-plan.interface';

type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'paused';

interface IPlanStepRow {
  index: number;
  step: IAgentPlanStep;
  status: StepStatus;
}

const PLAN_STATUS_I18N_PREFIX = 'assistant-chat.plan-execution.status.';
const PLAN_IRREVERSIBLE_STEP_I18N_KEY = 'assistant-chat.plan-execution.irreversible-hint';

@Component({
  selector: 'app-plan-execution-panel',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './plan-execution-panel.component.html',
  styleUrls: ['./plan-execution-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanExecutionPanelComponent {
  private planService = inject(DataManagementAgentPlanService);

  approveRequested = output<string>();
  abortRequested = output<string>();

  public readonly plan = this.planService.activePlan;
  public readonly isPaused = this.planService.isPausedForApproval;
  public readonly isExecuting = this.planService.isExecuting;
  public readonly isCompleted = this.planService.isCompleted;
  public readonly isFailed = this.planService.isFailed;
  public readonly isApproving = this.planService.isApproving;
  public readonly isAborting = this.planService.isAborting;

  public readonly canAbort = computed(() => this.isExecuting() || this.isPaused());
  public readonly isBusy = computed(() => this.isApproving() || this.isAborting());

  public readonly rows = computed<IPlanStepRow[]>(() => {
    const plan = this.plan();
    if (!plan) return [];

    const steps = this.planService.steps();
    return steps.map((step, index) => ({
      index,
      step,
      status: this.computeStepStatus(plan.status, plan.currentStepIndex, index),
    }));
  });

  public onApproveClick(): void {
    const plan = this.plan();
    if (plan && this.isPaused() && !this.isBusy()) {
      this.approveRequested.emit(plan.id);
    }
  }

  public onAbortClick(): void {
    const plan = this.plan();
    if (plan && this.canAbort() && !this.isBusy()) {
      this.abortRequested.emit(plan.id);
    }
  }

  public statusLabelKey(status: PlanStatusValue): string {
    return `${PLAN_STATUS_I18N_PREFIX}${status}`;
  }

  public readonly irreversibleStepHintKey = PLAN_IRREVERSIBLE_STEP_I18N_KEY;

  private computeStepStatus(planStatus: PlanStatusValue, currentIndex: number, stepIndex: number): StepStatus {
    if (stepIndex < currentIndex) return 'done';
    if (stepIndex > currentIndex) return 'pending';
    switch (planStatus) {
      case PlanStatus.Executing:
        return 'running';
      case PlanStatus.PausedForApproval:
        return 'paused';
      case PlanStatus.Failed:
        return 'failed';
      case PlanStatus.Completed:
        return 'done';
      default:
        return 'pending';
    }
  }
}
