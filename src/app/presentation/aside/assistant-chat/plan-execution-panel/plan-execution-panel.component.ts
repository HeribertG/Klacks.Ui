// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Side panel that visualises a running AgentPlan: each step as a row with status icon
 * (pending / running / done / failed / paused), the skill name, and an inline
 * Approve-button when the plan is paused for HITL approval at that step.
 * @param approveRequested - Emits the planId when the user clicks Approve on the paused step
 */

import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
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

@Component({
  selector: 'app-plan-execution-panel',
  standalone: true,
  imports: [],
  templateUrl: './plan-execution-panel.component.html',
  styleUrls: ['./plan-execution-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanExecutionPanelComponent {
  private planService = inject(DataManagementAgentPlanService);

  approveRequested = output<string>();

  public readonly plan = this.planService.activePlan;
  public readonly isPaused = this.planService.isPausedForApproval;
  public readonly isExecuting = this.planService.isExecuting;
  public readonly isCompleted = this.planService.isCompleted;
  public readonly isFailed = this.planService.isFailed;

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
    if (plan && this.isPaused()) {
      this.approveRequested.emit(plan.id);
    }
  }

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
