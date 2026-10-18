// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Offers Klacksy's short explanation of the two shift holiday options (FT / +FT) when the user ticks one of them
 * (T5). The offer is an interactive toast with three chips - yes, later, no thanks - and is never forced: "yes" opens
 * the Klacksy panel and sends the per-language trigger phrase as a real user turn (the phrase carries a synonym of
 * happen 77, so the keyword guarantee puts it in the toolset), "later" and "no" only record the answer, and a toast
 * closed or pushed away without a choice sends nothing. The backend decides per account whether the offer may come
 * (beginners only, muted after yes/no, after the second "later" and after the third unanswered offer); this service
 * adds the per-session gate (keyed by the signed-in user, several people share one office PC) and stays silent while
 * the guided tour runs, while another interactive toast is open, or when a text is missing in the active language.
 * @param translate - Resolves the offer text, the chip labels and the trigger phrase
 * @param toastShowService - Shows the offer as an interactive reply toast
 * @param conversationOrchestrator - Sends the trigger phrase as a user turn once accepted
 * @param asideService - Opens the Klacksy panel once the offer is accepted
 * @param onboarding - Whether the guided tour is running
 * @param offerState - Per-account offer state from the backend; records the reactions
 */

import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { OnboardingService } from './onboarding.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import {
  EXPLAIN_OFFER_OUTCOME,
  EXPLAIN_OFFER_TOPIC,
  ExplainOfferOutcome,
  HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS,
} from 'src/app/domain/constants/explain-offer.constants';
import { ExplainOfferStateService } from 'src/app/domain/services/assistant/explain-offer-state.service';

/** AssistantChatComponent only mounts once the aside becomes visible, so submitText() is deferred one macrotask
 * after show() - same mount-timing workaround as PluginSetupAssistantOfferService. */
const ASSISTANT_CHAT_MOUNT_DELAY_MS = 0;
const SESSION_FLAG = 'true';
const SESSION_KEY_SEPARATOR = '.';

@Injectable({ providedIn: 'root' })
export class HolidayOptionExplainOfferService {
  private readonly translate = inject(TranslateService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly conversationOrchestrator = inject(ConversationOrchestratorService);
  private readonly asideService = inject(AsideService);
  private readonly onboarding = inject(OnboardingService);
  private readonly offerState = inject(ExplainOfferStateService);

  private readonly topic = EXPLAIN_OFFER_TOPIC.ShiftHolidayOptions;
  private inFlight = false;

  async offerOnce(): Promise<void> {
    const userId = this.offerState.currentUserId();
    if (!userId || this.inFlight || this.onboarding.isTourActive() || this.wasOfferedThisSession(userId)) {
      return;
    }

    this.inFlight = true;
    try {
      if (!(await this.offerState.shouldOffer(this.topic))) {
        return;
      }

      if (this.onboarding.isTourActive() || this.toastShowService.hasOpenInteractiveReply()) {
        return;
      }

      const texts = this.resolveTexts();
      if (!texts) {
        return;
      }

      this.markOfferedThisSession(userId);
      this.offerState.record(this.topic, EXPLAIN_OFFER_OUTCOME.Shown);
      this.toastShowService.showInteractiveReply(
        {
          selectionMode: 'single',
          prompt: texts.prompt,
          options: [
            { label: texts.accept, value: EXPLAIN_OFFER_OUTCOME.Accepted },
            { label: texts.later, value: EXPLAIN_OFFER_OUTCOME.Later },
            { label: texts.decline, value: EXPLAIN_OFFER_OUTCOME.Declined },
          ],
        },
        (values) => this.onChosen(values, texts.triggerPhrase),
      );
    } finally {
      this.inFlight = false;
    }
  }

  private onChosen(values: string[], triggerPhrase: string): void {
    const outcome = values.find((value): value is ExplainOfferOutcome =>
      value === EXPLAIN_OFFER_OUTCOME.Accepted
      || value === EXPLAIN_OFFER_OUTCOME.Later
      || value === EXPLAIN_OFFER_OUTCOME.Declined);
    if (!outcome) {
      return;
    }

    this.offerState.record(this.topic, outcome);
    if (outcome !== EXPLAIN_OFFER_OUTCOME.Accepted) {
      return;
    }

    this.asideService.show();
    setTimeout(() => {
      void this.conversationOrchestrator.submitText(triggerPhrase);
    }, ASSISTANT_CHAT_MOUNT_DELAY_MS);
  }

  private resolveTexts(): Record<keyof typeof HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS, string> | null {
    const texts = {} as Record<keyof typeof HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS, string>;
    for (const [name, key] of Object.entries(HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS) as [
      keyof typeof HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS,
      string,
    ][]) {
      const text = this.translate.instant(key);
      if (typeof text !== 'string' || !text.trim() || text === key) {
        return null;
      }
      texts[name] = text;
    }
    return texts;
  }

  private sessionKey(userId: string): string {
    return StorageKeys.EXPLAIN_OFFER_OFFERED_PREFIX + this.topic + SESSION_KEY_SEPARATOR + userId;
  }

  private wasOfferedThisSession(userId: string): boolean {
    try {
      return sessionStorage.getItem(this.sessionKey(userId)) === SESSION_FLAG;
    } catch {
      return false;
    }
  }

  private markOfferedThisSession(userId: string): void {
    try {
      sessionStorage.setItem(this.sessionKey(userId), SESSION_FLAG);
    } catch {
      return;
    }
  }
}
