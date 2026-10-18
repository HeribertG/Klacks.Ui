// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the "Why? Ask Klacksy" action of the toast that reports a refused single work booking (T5 part b). The link
 * is passive - it is offered with every such toast and needs no dosage. A click records one "accepted" for the
 * passive topic (measurement only), opens the Klacksy panel and sends the localized question about the refused cell
 * as a real user turn; the question carries a synonym of diagnose_work_booking, so the keyword guarantee puts the
 * diagnosis into the toolset. No action while the guided tour runs or when a text is missing in the active language
 * (no raw key in the chat).
 * @param subject - Person name, company-local date and shift name of the refused cell
 */

import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { OnboardingService } from './onboarding.service';
import { AssistantTurnLauncherService } from './assistant-turn-launcher.service';
import { ExplainOfferStateService } from 'src/app/domain/services/assistant/explain-offer-state.service';
import { EXPLAIN_OFFER_OUTCOME, EXPLAIN_OFFER_TOPIC } from 'src/app/domain/constants/explain-offer.constants';
import { WORK_REFUSAL_EXPLAIN } from 'src/app/domain/constants/work-refusal-explain.constants';
import { IWorkRefusalDiagnosisSubject } from 'src/app/domain/interfaces/work-refusal-diagnosis-subject.interface';
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

    const label = this.translated(WORK_REFUSAL_EXPLAIN.ASK_KLACKSY_KEY);
    const question = this.translated(WORK_REFUSAL_EXPLAIN.TRIGGER_PHRASE_KEY, { ...subject });
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

  private translated(key: string, params?: Record<string, string>): string | null {
    const text = this.translate.instant(key, params);
    return typeof text === 'string' && text.trim() && text !== key ? text : null;
  }
}
