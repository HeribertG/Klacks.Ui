// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Side panel listing Klacksy's self-proposed goal candidates (Phase 2): each candidate
 * as a row with title, rationale and Approve/Reject actions. Title and rationale are
 * rendered from the i18n keys the server derives from its goal-type catalogue, so they
 * appear in the user's own language; candidates stored before that catalogue existed carry
 * no keys and fall back to their stored English text. Approving records the decision and lets
 * the server draft a plan from it; that plan then runs unattended when the candidate's own
 * confidence is high and the configured autonomy allows it, so the panel must say so rather
 * than promise a further confirmation step.
 * Loads the proposed candidates once the aside becomes visible (skipped while the setup
 * tour is running, mirroring the neighboring proactive-inbox load gate).
 */

import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { Observable } from 'rxjs';
import { DataManagementGoalCandidatesService } from 'src/app/domain/services/assistant/data-management-goal-candidates.service';
import { GOAL_CANDIDATE_CONFIDENCE } from 'src/app/domain/constants/goal-candidate.constants';
import { IGoalCandidate } from 'src/app/domain/interfaces/goal-candidate.interface';
import { AsideService } from '../../aside.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType, KlacksyTargetRequestedEvent } from 'src/app/domain/events/domain-events';

const CONFIDENCE_I18N_PREFIX = 'assistant-chat.goal-candidates.confidence.';
const LOAD_ERROR_I18N_KEY = 'assistant-chat.goal-candidates.load-error';
const APPROVE_ERROR_I18N_KEY = 'assistant-chat.goal-candidates.approve-error';
const REJECT_ERROR_I18N_KEY = 'assistant-chat.goal-candidates.reject-error';
const KLACKSY_TARGET_PREFIX = 'goal-candidates-panel';

// Only a self-assessment the model actually committed to is worth showing; 'unknown' is the
// server's fallback for a missing or unparsable value and says nothing a reader can act on.
const LABELLED_CONFIDENCE_VALUES: readonly string[] = [
  GOAL_CANDIDATE_CONFIDENCE.High,
  GOAL_CANDIDATE_CONFIDENCE.Low,
];
const NO_RATIONALE_PARAMS: Record<string, string> = {};

@Component({
  selector: 'app-goal-candidates-panel',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule],
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
  private eventBus = inject(EVENT_BUS_TOKEN);
  private readonly destroyRef = inject(DestroyRef);

  private loadRequested = false;

  readonly faChevronDown = faChevronDown;
  readonly faChevronUp = faChevronUp;

  public readonly candidates = this.goalCandidatesService.candidates;
  public readonly hasCandidates = this.goalCandidatesService.hasCandidates;
  public readonly isExpanded = signal<boolean>(true);
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

    this.eventBus
      .on<KlacksyTargetRequestedEvent>(DomainEventType.KLACKSY_TARGET_REQUESTED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ target }) => {
        if (target.startsWith(KLACKSY_TARGET_PREFIX)) {
          this.isExpanded.set(true);
        }
      });
  }

  public toggleExpanded(): void {
    this.isExpanded.update((expanded) => !expanded);
  }

  public hasConfidenceLabel(confidence: string): boolean {
    return LABELLED_CONFIDENCE_VALUES.includes(confidence?.toLowerCase());
  }

  public confidenceLabelKey(confidence: string): string {
    return `${CONFIDENCE_I18N_PREFIX}${confidence?.toLowerCase()}`;
  }

  public rationaleParams(candidate: IGoalCandidate): Record<string, string> {
    return candidate.rationaleParams ?? NO_RATIONALE_PARAMS;
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
