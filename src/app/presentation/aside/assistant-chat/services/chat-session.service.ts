// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Conversation session of one assistant chat instance: the conversation id the turns are sent under,
 * what happens whenever the panel opens (providers, model cache, welcome, active plan) and the reset
 * that starts a new conversation.
 * @param conversationId - Id the backend knows the conversation by; replaced on clear
 */
import { DestroyRef, Injectable, Injector, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { DataManagementAgentPlanService } from 'src/app/domain/services/assistant/data-management-agent-plan.service';
import { DataManagementProactiveInboxService } from 'src/app/domain/services/assistant/data-management-proactive-inbox.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { AsideService } from '../../aside.service';
import { createConversationId } from '../chat-ids.helper';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { ChatStageStatusService } from './chat-stage-status.service';
import { ChatTranscriptService } from './chat-transcript.service';
import { ChatOnboardingTourService } from './chat-onboarding-tour.service';
import { ChatWelcomeService } from './chat-welcome.service';

@Injectable()
export class ChatSessionService {
  private readonly assistantService = inject(DataManagementAssistantService);
  private readonly assistantProviderService = inject(DataManagementAssistantProviderService);
  private readonly planService = inject(DataManagementAgentPlanService);
  private readonly proactiveInboxService = inject(DataManagementProactiveInboxService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);
  private readonly asideService = inject(AsideService);
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly chatStageStatus = inject(ChatStageStatusService);
  private readonly transcript = inject(ChatTranscriptService);
  private readonly tour = inject(ChatOnboardingTourService);
  private readonly welcome = inject(ChatWelcomeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  conversationId = createConversationId();

  /**
   * Registers the panel-open effects. The plan refresh is a separate effect that depends ONLY on
   * isVisible: the welcome check reads the message count, which changes on every streamed token, and
   * folding the refresh in there would re-fire listMyPlans many times per second while streaming and
   * clobber the SignalR-maintained active plan mid-conversation.
   */
  connect(): void {
    effect(() => {
      if (this.asideService.isVisible()) {
        this.assistantProviderService.loadProviders();
        this.assistantService.warmupCache();

        if (!this.asideService.openedWithContext() && this.orchestrator.messages().length === 0) {
          this.welcome.addWelcomeMessage(this.currentTranslateLanguage());
        }
      }
    }, { injector: this.injector });

    effect(() => {
      if (this.asideService.isVisible()) {
        this.planService.refreshActivePlan()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
      }
    }, { injector: this.injector });
  }

  /**
   * @param conversationId - Id the backend reported at stream start
   */
  adoptConversationId(conversationId: string): void {
    this.conversationId = conversationId;
  }

  clearChat(): void {
    this.tour.resetPendingStation();
    this.chatStageStatus.clear();
    this.proactiveInboxService.resetInboxBlock();
    this.orchestrator.clearMessages();
    this.toastShowService.dismissInteractiveReplies();

    this.assistantService.clearConversation(this.conversationId);
    this.conversationId = createConversationId();

    this.welcome.addWelcomeMessage(this.currentTranslateLanguage());
    this.transcript.requestScrollToBottom();
  }

  private currentTranslateLanguage(): string {
    return this.translateService.currentLang || this.translateService.defaultLang;
  }
}
