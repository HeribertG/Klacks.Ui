// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Offers the Klacksy setup consultation to a user whose installation holds nothing to plan yet.
 * Exists because the backend's proactive no_schedule_yet notice dedups permanently — once dismissed
 * it never returns — so the re-entry has to live on the client. The offer is shown as an interactive
 * reply toast rather than a chat message: it needs no Klacksy panel open and no model turn just to
 * ask a question, and the accept chip's value is the recipe's own trigger phrase, so accepting it
 * starts the consultation deterministically instead of hoping the model emits the right marker.
 * @param translate - Resolves the offer text and, crucially, the per-language trigger phrase
 * @param toastShowService - Surfaces the offer as an interactive reply toast, independent of the Klacksy panel
 * @param conversationOrchestrator - Submits the trigger phrase as a real user turn once accepted
 * @param asideService - Opens the Klacksy panel, but only once the offer is accepted
 * @param onboarding - Single source of truth for whether the guided tour is running
 */

import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { OnboardingService } from './onboarding.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

const OFFER_TEXT_KEY = 'setupConsultation.offer';
const OFFER_ACCEPT_KEY = 'setupConsultation.offerAccept';
const OFFER_DECLINE_KEY = 'setupConsultation.offerDecline';
const TRIGGER_PHRASE_KEY = 'setupConsultation.triggerPhrase';
const DECLINE_VALUE = 'none';
/** AssistantChatComponent (and therefore the orchestrator's callbacks) only mounts once the aside
 * becomes visible, so submitText() is deferred one macrotask via setTimeout(0) after show() — the
 * same mount-timing workaround used by active-industries-settings.component.ts. */
const ASSISTANT_CHAT_MOUNT_DELAY_MS = 0;

@Injectable({ providedIn: 'root' })
export class SetupConsultationOfferService {
  private readonly translate = inject(TranslateService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly conversationOrchestrator = inject(ConversationOrchestratorService);
  private readonly asideService = inject(AsideService);
  private readonly onboarding = inject(OnboardingService);

  offerIfNeeded(): void {
    if (this.onboarding.isTourActive() || this.wasOfferedThisSession()) {
      return;
    }

    this.markOfferedThisSession();

    const triggerPhrase = this.translate.instant(TRIGGER_PHRASE_KEY);

    this.toastShowService.showInteractiveReply(
      {
        selectionMode: 'single',
        prompt: this.translate.instant(OFFER_TEXT_KEY),
        options: [
          { label: this.translate.instant(OFFER_ACCEPT_KEY), value: triggerPhrase },
          { label: this.translate.instant(OFFER_DECLINE_KEY), value: DECLINE_VALUE },
        ],
      },
      (values) => {
        if (!values.includes(triggerPhrase)) {
          return;
        }
        this.asideService.show();
        setTimeout(() => {
          void this.conversationOrchestrator.submitText(triggerPhrase);
        }, ASSISTANT_CHAT_MOUNT_DELAY_MS);
      },
    );
  }

  private wasOfferedThisSession(): boolean {
    try {
      return sessionStorage.getItem(StorageKeys.SETUP_CONSULTATION_OFFERED) === 'true';
    } catch {
      return false;
    }
  }

  private markOfferedThisSession(): void {
    try {
      sessionStorage.setItem(StorageKeys.SETUP_CONSULTATION_OFFERED, 'true');
    } catch {
      return;
    }
  }
}
