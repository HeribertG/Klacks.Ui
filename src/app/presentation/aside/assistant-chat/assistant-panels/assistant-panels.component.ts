// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Renders goal-candidates, plan-execution and proactive-inbox panels as floating toasts in the
 * overlay rail, present in every mode whenever the assistant is open. Panels are collapsed by
 * default (the inbox keeps its own service-level default of expanded) and can be
 * expanded/collapsed independently. Toasts stack upward with no limit. The inbox message list
 * auto-scrolls to its latest row whenever the list grows, matching the behavior the chat's own
 * inline inbox block used to have before it moved here.
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterEveryRender,
  effect,
  computed,
  inject,
  input,
  signal,
  viewChild,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faBullseye,
  faListCheck,
  faLightbulb,
  faXmark,
  faBell,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { GoalCandidatesPanelComponent } from '../goal-candidates-panel/goal-candidates-panel.component';
import { PlanExecutionPanelComponent } from '../plan-execution-panel/plan-execution-panel.component';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { ChatMessageActionsService } from '../services/chat-message-actions.service';
import { DataManagementAgentPlanService } from 'src/app/domain/services/assistant/data-management-agent-plan.service';
import { DataManagementGoalCandidatesService } from 'src/app/domain/services/assistant/data-management-goal-candidates.service';
import { DataManagementProactiveInboxService } from 'src/app/domain/services/assistant/data-management-proactive-inbox.service';
import { AsideService } from '../../aside.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';

@Component({
  selector: 'app-assistant-panels',
  standalone: true,
  imports: [
    TranslateModule,
    FontAwesomeModule,
    GoalCandidatesPanelComponent,
    PlanExecutionPanelComponent,
    ChatMessageComponent,
  ],
  templateUrl: './assistant-panels.component.html',
  styleUrls: ['./assistant-panels.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.embedded]': 'embedded()',
  },
})
export class AssistantPanelsComponent {
  /**
   * True when the cards sit inside the chat panel rather than in the overlay rail. Floating over a
   * page they need a border, a shadow and a width of their own to read as separate surfaces; inside
   * the conversation all three are noise, so the cards flatten to full-width bars there.
   */
  readonly embedded = input<boolean>(false);

  private planService = inject(DataManagementAgentPlanService);
  private goalCandidatesService = inject(DataManagementGoalCandidatesService);
  private readonly asideService = inject(AsideService);
  private readonly onboarding = inject(OnboardingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageActions = inject(ChatMessageActionsService);
  private readonly proactiveInboxService = inject(
    DataManagementProactiveInboxService,
  );

  private loadRequested = false;
  private shouldScrollInboxToBottom = false;
  private previousInboxMessageCount = 0;

  private readonly inboxMessagesScrollContainer = viewChild<
    ElementRef<HTMLElement>
  >('inboxMessagesScrollContainer');

  constructor() {
    // GoalCandidatesPanelComponent normally triggers this load, but here it only mounts once a
    // card exists, and a card only exists once candidates are loaded. Without its own trigger the
    // stack would stay empty forever: nothing renders, so nothing loads.
    effect(() => {
      if (!this.asideService.isVisible()) {
        this.loadRequested = false;
        this.restoreDismissedCards();
        return;
      }
      if (this.onboarding.isTourActive() || this.loadRequested) {
        return;
      }
      this.loadRequested = true;
      this.goalCandidatesService
        .loadCandidates()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => undefined });
    });

    // The chat used to auto-scroll its inbox block to the bottom whenever a fresh or reminded
    // row arrived. Moving inbox rendering to this card must keep that: otherwise a new row lands
    // below the fold of the 300px scroll container with no visible sign it exists.
    effect(() => {
      const count = this.inboxMessages().length;
      if (count > this.previousInboxMessageCount) {
        this.shouldScrollInboxToBottom = true;
      }
      this.previousInboxMessageCount = count;
    });

    afterEveryRender(() => {
      if (!this.shouldScrollInboxToBottom) {
        return;
      }
      const container = this.inboxMessagesScrollContainer();
      if (container) {
        container.nativeElement.scrollTop =
          container.nativeElement.scrollHeight;
      }
      this.shouldScrollInboxToBottom = false;
    });
  }

  @ViewChild(PlanExecutionPanelComponent)
  private planPanel?: PlanExecutionPanelComponent;

  readonly faBullseye = faBullseye;
  readonly faListCheck = faListCheck;
  readonly faLightbulb = faLightbulb;
  readonly faChevronDown = faChevronDown;
  readonly faChevronUp = faChevronUp;
  readonly faXmark = faXmark;
  readonly faBell = faBell;
  readonly faEyeSlash = faEyeSlash;

  // Collapsed by default
  readonly isCandidatesExpanded = signal<boolean>(false);
  readonly isPlanExpanded = signal<boolean>(false);

  readonly candidates = this.goalCandidatesService.candidates;
  readonly hasCandidates = this.goalCandidatesService.hasCandidates;
  readonly hasVisiblePlan = this.planService.hasVisiblePlan;
  readonly plan = this.planService.activePlan;

  // Shared with AssistantChatComponent via ChatMessageActionsService: both surfaces read the
  // same inbox-message list and trigger the same expand/hide actions on the same state. The
  // inbox keeps its own root-scoped default (expanded) rather than the collapsed-by-default of
  // the other two cards - no behavior change from what the chat used to show.
  readonly inboxMessages = this.messageActions.inboxMessages;
  readonly hasInboxMessages = computed(() => this.inboxMessages().length > 0);
  readonly isInboxExpanded = this.proactiveInboxService.inboxExpanded;

  // A card floating in the rail covers the page behind it and, unlike the interactive toast, has
  // no way to be got out of the way. Dismissing one records what it held at that moment; it comes
  // back as soon as there is more than that, and unconditionally when the assistant is reopened
  // (restoreDismissedCards runs as the aside closes).
  private readonly dismissedAtCandidateCount = signal<number | null>(null);
  private readonly dismissedAtInboxCount = signal<number | null>(null);
  private readonly dismissedPlanId = signal<string | null>(null);

  readonly showCandidatesCard = computed<boolean>(() => {
    if (!this.hasCandidates()) return false;
    const dismissedAt = this.dismissedAtCandidateCount();
    return dismissedAt === null || this.candidates().length > dismissedAt;
  });

  readonly showInboxCard = computed<boolean>(() => {
    if (!this.hasInboxMessages()) return false;
    const dismissedAt = this.dismissedAtInboxCount();
    return dismissedAt === null || this.inboxMessages().length > dismissedAt;
  });

  // A plan has no count to grow, so its identity is the measure of "something new".
  readonly showPlanCard = computed<boolean>(() => {
    if (!this.hasVisiblePlan()) return false;
    const dismissedId = this.dismissedPlanId();
    return dismissedId === null || this.plan()?.id !== dismissedId;
  });

  readonly planStatusLabelKey = computed(() => {
    const plan = this.plan();
    if (!plan) return '';
    return `assistant-chat.plan-execution.status.${plan.status}`;
  });

  toggleCandidates(): void {
    this.isCandidatesExpanded.update((v) => !v);
  }

  togglePlan(): void {
    this.isPlanExpanded.update((v) => !v);
  }

  toggleInbox(): void {
    this.messageActions.toggleInboxExpanded();
  }

  hideWholeInbox(): void {
    this.messageActions.hideWholeInbox();
  }

  dismissCandidates(): void {
    this.dismissedAtCandidateCount.set(this.candidates().length);
  }

  dismissInbox(): void {
    this.dismissedAtInboxCount.set(this.inboxMessages().length);
  }

  dismissPlan(): void {
    this.dismissedPlanId.set(this.plan()?.id ?? null);
  }

  private restoreDismissedCards(): void {
    this.dismissedAtCandidateCount.set(null);
    this.dismissedAtInboxCount.set(null);
    this.dismissedPlanId.set(null);
  }

  onPlanApprove(_planId: string): void {
    this.planPanel?.onApproveClick();
  }

  onPlanAbort(_planId: string): void {
    this.planPanel?.onAbortClick();
  }
}
