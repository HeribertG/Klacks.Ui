// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Side panel listing Klacksy's self-proposed goal candidates (Phase 2): each candidate
 * as a row with title, full rationale text and Approve/Reject actions. Approving or
 * rejecting only records a decision - no plan is created and nothing is executed.
 * Loads the proposed candidates once the aside becomes visible (skipped while the setup
 * tour is running, mirroring the neighboring proactive-inbox load gate).
 */

import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { DataManagementGoalCandidatesService } from 'src/app/domain/services/assistant/data-management-goal-candidates.service';
import { GOAL_CANDIDATE_CONFIDENCE } from 'src/app/domain/constants/goal-candidate.constants';
import { AsideService } from '../../aside.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

const CONFIDENCE_I18N_PREFIX = 'assistant-chat.goal-candidates.confidence.';
const LOAD_ERROR_I18N_KEY = 'assistant-chat.goal-candidates.load-error';
const APPROVE_ERROR_I18N_KEY = 'assistant-chat.goal-candidates.approve-error';
const REJECT_ERROR_I18N_KEY = 'assistant-chat.goal-candidates.reject-error';
const KNOWN_CONFIDENCE_VALUES: readonly string[] = Object.values(GOAL_CANDIDATE_CONFIDENCE);

@Component({
  selector: 'app-goal-candidates-panel',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './goal-candidates-panel.component.html',
  styleUrls: ['./goal-candidates-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalCandidatesPanelComponent {
  private goalCandidatesService = inject(DataManagementGoalCandidatesService);
  private asideService = inject(AsideService);
  private onboarding = inject(OnboardingService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private loadRequested = false;

  public readonly candidates = this.goalCandidatesService.candidates;
  public readonly hasCandidates = this.goalCandidatesService.hasCandidates;
  private readonly pendingDecisionId = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.asideService.isVisible()) {
        this.loadRequested = false;
        return;
      }
      if (this.onboarding.isTourActive() || this.loadRequested) {
        return;
      }
      this.loadRequested = true;
      this.loadCandidates();
    });
  }

  public confidenceLabelKey(confidence: string): string {
    const normalized = KNOWN_CONFIDENCE_VALUES.includes(confidence)
      ? confidence
      : GOAL_CANDIDATE_CONFIDENCE.Unknown;
    return `${CONFIDENCE_I18N_PREFIX}${normalized.toLowerCase()}`;
  }

  public onApprove(id: string): void {
    this.decide(id, () => this.goalCandidatesService.approve(id), APPROVE_ERROR_I18N_KEY);
  }

  public onReject(id: string): void {
    this.decide(id, () => this.goalCandidatesService.reject(id), REJECT_ERROR_I18N_KEY);
  }

  public isPending(id: string): boolean {
    return this.pendingDecisionId() === id;
  }

  private loadCandidates(): void {
    this.goalCandidatesService
      .loadCandidates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => this.showError(LOAD_ERROR_I18N_KEY) });
  }

  private decide(id: string, action: () => Observable<void>, errorKey: string): void {
    if (this.pendingDecisionId() !== null) {
      return;
    }
    this.pendingDecisionId.set(id);
    action()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.pendingDecisionId.set(null),
        error: () => {
          this.pendingDecisionId.set(null);
          this.showError(errorKey);
        },
      });
  }

  private showError(errorKey: string): void {
    this.toastShowService.showError(this.translateService.instant(errorKey));
  }
}
