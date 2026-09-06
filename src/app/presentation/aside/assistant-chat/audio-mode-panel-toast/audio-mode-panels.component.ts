// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Renders goal-candidates and plan-execution panels as floating toasts
 * when Klacksy is in audio-only output mode. Panels are collapsed by default
 * and can be expanded/collapsed independently. Toasts stack upward with no limit.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faChevronUp, faBullseye, faListCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { GoalCandidatesPanelComponent } from '../goal-candidates-panel/goal-candidates-panel.component';
import { PlanExecutionPanelComponent } from '../plan-execution-panel/plan-execution-panel.component';
import { DataManagementAgentPlanService } from 'src/app/domain/services/assistant/data-management-agent-plan.service';
import { DataManagementGoalCandidatesService } from 'src/app/domain/services/assistant/data-management-goal-candidates.service';

@Component({
  selector: 'app-audio-mode-panels',
  standalone: true,
  imports: [
    TranslateModule,
    FontAwesomeModule,
    GoalCandidatesPanelComponent,
    PlanExecutionPanelComponent,
  ],
  templateUrl: './audio-mode-panels.component.html',
  styleUrls: ['./audio-mode-panels.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AudioModePanelsComponent {
  private planService = inject(DataManagementAgentPlanService);
  private goalCandidatesService = inject(DataManagementGoalCandidatesService);

  @ViewChild(PlanExecutionPanelComponent)
  private planPanel?: PlanExecutionPanelComponent;

  readonly faBullseye = faBullseye;
  readonly faListCheck = faListCheck;
  readonly faChevronDown = faChevronDown;
  readonly faChevronUp = faChevronUp;
  readonly faXmark = faXmark;

  // Collapsed by default
  readonly isCandidatesExpanded = signal<boolean>(false);
  readonly isPlanExpanded = signal<boolean>(false);

  readonly candidates = this.goalCandidatesService.candidates;
  readonly hasCandidates = this.goalCandidatesService.hasCandidates;
  readonly hasVisiblePlan = this.planService.hasVisiblePlan;
  readonly plan = this.planService.activePlan;

  readonly planStatusLabelKey = computed(() => {
    const plan = this.plan();
    if (!plan) return '';
    return `assistant-chat.plan-execution.status.${plan.status}`;
  });

  toggleCandidates(): void {
    this.isCandidatesExpanded.update(v => !v);
  }

  togglePlan(): void {
    this.isPlanExpanded.update(v => !v);
  }

  onPlanApprove(_planId: string): void {
    this.planPanel?.onApproveClick();
  }

  onPlanAbort(_planId: string): void {
    this.planPanel?.onAbortClick();
  }
}
