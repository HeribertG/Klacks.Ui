// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the "Why? Ask Klacksy" action of the toast that reports a refused single work booking (T5 part b). The link
 * is passive - it is offered with every such toast and needs no dosage. A click records one "accepted" for the
 * passive topic (measurement only), opens the Klacksy panel and sends the localized question about the refused cell
 * as a real user turn; the question carries a synonym of diagnose_work_booking, so the keyword guarantee puts the
 * diagnosis into the toolset. Person and shift names come from other users' data, so they are cleaned first
 * (sanitizeChatPhraseValue); the person is named with the employee number when there is one. No action while the
 * guided tour runs, when a text is missing in the active language (no raw key in the chat), or when a name is empty
 * after cleaning.
 * @param subject - Person name, employee number, company-local date and shift name of the refused cell
 */

import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { AssistantTurnLauncherService } from './assistant-turn-launcher.service';
import { ExplainOfferStateService } from 'src/app/domain/services/assistant/explain-offer-state.service';
import { EXPLAIN_OFFER_OUTCOME, EXPLAIN_OFFER_TOPIC } from 'src/app/domain/constants/explain-offer.constants';
import { WORK_REFUSAL_EXPLAIN } from 'src/app/domain/constants/work-refusal-explain.constants';
import { IWorkRefusalDiagnosisSubject } from 'src/app/domain/interfaces/work-refusal-diagnosis-subject.interface';
import { sanitizeChatPhraseValue } from 'src/app/domain/helpers/chat-phrase-value.helper';
import { IToastAction } from 'src/app/presentation/toast/toast-action.interface';

@Injectable({ providedIn: 'root' })
export class WorkRefusalExplainService {
  private readonly translate = inject(TranslateService);
  private readonly onboarding = inject(OnboardingService);
  private readonly assistantTurnLauncher = inject(AssistantTurnLauncherService);
  private readonly offerState = inject(ExplainOfferStateService);

  buildAskAction(subject: IWorkRefusalDiagnosisSubject): IToastAction | null {
    if (this.onboarding.isTourActive()) {
      return null;
    }

    const name = sanitizeChatPhraseValue(subject.client, WORK_REFUSAL_EXPLAIN.MAX_NAME_LENGTH);
    const shift = sanitizeChatPhraseValue(subject.shift, WORK_REFUSAL_EXPLAIN.MAX_NAME_LENGTH);
    if (!name || !shift) {
      return null;
    }

    const client = this.personLabel(name, subject.clientNumber);
    const label = this.translated(WORK_REFUSAL_EXPLAIN.ASK_KLACKSY_KEY);
    const question = client
      ? this.translated(WORK_REFUSAL_EXPLAIN.TRIGGER_PHRASE_KEY, { client, date: subject.date, shift })
      : null;
    if (!label || !question) {
      return null;
    }

    return {
      label,
      onClick: () => {
        this.offerState.record(EXPLAIN_OFFER_TOPIC.WorkBookingRefusal, EXPLAIN_OFFER_OUTCOME.Accepted);
        this.assistantTurnLauncher.openAndAsk(question);
      },
    };
  }

  private personLabel(name: string, clientNumber: number | undefined): string | null {
    if (clientNumber === undefined) {
      return name;
    }
    return this.translated(WORK_REFUSAL_EXPLAIN.CLIENT_WITH_NUMBER_KEY, { name, number: String(clientNumber) });
  }

  private translated(key: string, params?: Record<string, string>): string | null {
    const text = this.translate.instant(key, params);
    return typeof text === 'string' && text.trim() && text !== key ? text : null;
  }
}
