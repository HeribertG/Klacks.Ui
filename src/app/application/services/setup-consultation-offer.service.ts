// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Offers the Klacksy setup consultation to a user whose installation holds nothing to plan yet.
 * Exists because the backend's proactive no_schedule_yet notice dedups permanently — once dismissed
 * it never returns — so the re-entry has to live on the client. The offer is a locally built
 * assistant message with its own reply chips rather than a model turn: nothing has to be generated
 * to ask a question, and the chip value is the recipe's own trigger phrase, so clicking it starts
 * the consultation deterministically instead of hoping the model emits the right marker.
 * @param translate - Resolves the offer text and, crucially, the per-language trigger phrase
 * @param orchestrator - Receives the locally built message
 * @param asideService - Opens the Klacksy panel so the message is visible
 * @param onboarding - Single source of truth for whether the guided tour is running
 */

import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { OnboardingService } from './onboarding.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

const OFFER_TEXT_KEY = 'setupConsultation.offer';
const OFFER_ACCEPT_KEY = 'setupConsultation.offerAccept';
const OFFER_DECLINE_KEY = 'setupConsultation.offerDecline';
const TRIGGER_PHRASE_KEY = 'setupConsultation.triggerPhrase';
const DECLINE_VALUE = 'none';

@Injectable({ providedIn: 'root' })
export class SetupConsultationOfferService {
  private readonly translate = inject(TranslateService);
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly asideService = inject(AsideService);
  private readonly onboarding = inject(OnboardingService);

  offerIfNeeded(): void {
    if (this.onboarding.isTourActive() || this.wasOfferedThisSession()) {
      return;
    }

    this.markOfferedThisSession();
    this.asideService.show();
    this.orchestrator.addMessage({
      id: `setup-consultation-offer-${Date.now()}`,
      sender: 'assistant',
      content: this.translate.instant(OFFER_TEXT_KEY),
      timestamp: new Date(),
      suggestedReplies: {
        selectionMode: 'single',
        options: [
          {
            label: this.translate.instant(OFFER_ACCEPT_KEY),
            value: this.translate.instant(TRIGGER_PHRASE_KEY),
          },
          { label: this.translate.instant(OFFER_DECLINE_KEY), value: DECLINE_VALUE },
        ],
      },
    });
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
