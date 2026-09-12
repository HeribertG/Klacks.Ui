// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Turns the browser-side outcome of a Klacksy navigation into something the user can see and the
 * backend can count (W0). The model streams its prose before the browser has moved, so a navigation
 * that fell short would otherwise leave a claim standing that never happened: the correction is
 * appended to the assistant message, never replaces it, and every outcome is reported so the miss
 * rate has a denominator.
 * @param orchestrator - Holds the conversation messages and the speech state machine
 * @param assistantService - Passthrough to the navigation-outcome telemetry endpoint
 * @param translate - Resolves the correction sentence and supplies the reported locale
 */
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, firstValueFrom } from 'rxjs';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { NavigationResult } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import {
  NAVIGATION_OUTCOME_FEATURE_DISABLED,
  NAVIGATION_OUTCOME_MAX_UTTERANCE_LENGTH,
  NAVIGATION_OUTCOME_PERMISSION_DENIED,
  NAVIGATION_OUTCOME_SCROLLED,
  NAVIGATION_OUTCOME_TARGET_MISS,
  NAVIGATION_REASON_FEATURE_DISABLED,
  NAVIGATION_REASON_PERMISSION_DENIED,
  NAVIGATION_REASON_TARGET_NOT_FOUND,
  NAV_CORRECTION_FEATURE_DISABLED_KEY,
  NAV_CORRECTION_PERMISSION_DENIED_KEY,
  NAV_CORRECTION_TARGET_NOT_FOUND_KEY,
} from 'src/app/domain/constants/navigation-outcome.constants';
import { formatMessage } from 'src/app/shared/helpers/assistant-text.helper';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';

@Injectable({ providedIn: 'root' })
export class NavigationVerdictService {
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly assistantService = inject(DataManagementAssistantService);
  private readonly translate = inject(TranslateService);

  private readonly correctionAppendedSubject = new Subject<void>();

  /**
   * Fires after a correction was appended. The verdict lands up to 1500 ms after the stream ended,
   * by which time the reader may have scrolled away - and a correction nobody sees does not fix a
   * false claim.
   */
  readonly correctionAppended$ = this.correctionAppendedSubject.asObservable();

  /**
   * Reports the outcome and, when the navigation fell short in a way the user can act on, appends
   * the correction sentence to the assistant message.
   * @param messageId - The assistant message the navigation belonged to
   * @param outcome - What the navigation service reported back
   * @param route - Route the browser was sent to
   * @param target - The data-klacksy-target that was requested, if any
   * @param utterance - The user message this navigation answered
   */
  apply(
    messageId: string,
    outcome: NavigationResult,
    route: string,
    target?: string,
    utterance?: string,
  ): void {
    this.report(outcome, route, target, utterance);

    const correctionKey = this.correctionKeyFor(outcome);
    if (!correctionKey) return;

    this.appendCorrection(messageId, correctionKey);
  }

  /**
   * Reports the outcome without touching the message. Used for every navigation of a turn except
   * the last one: a correction about a page the user has already left is noise, but the measurement
   * still counts.
   */
  report(outcome: NavigationResult, route: string, target?: string, utterance?: string): void {
    const reported = this.outcomeKindFor(outcome, target);
    if (!reported) return;

    firstValueFrom(
      this.assistantService.reportNavigationOutcome({
        route,
        target,
        outcome: reported,
        locale: this.translate.currentLang,
        utterance: utterance?.slice(0, NAVIGATION_OUTCOME_MAX_UTTERANCE_LENGTH),
      }),
    ).catch(() => undefined);
  }

  /**
   * The server saw a plausible in-page candidate for a navigation the model performed without a
   * target. It has already logged that itself, so this only puts the sentence in front of the user.
   */
  applySuspectedMiss(messageId: string): void {
    this.appendCorrection(messageId, NAV_CORRECTION_TARGET_NOT_FOUND_KEY);
  }

  private correctionKeyFor(outcome: NavigationResult): string | null {
    if (outcome.success) return null;
    if (outcome.reason === NAVIGATION_REASON_TARGET_NOT_FOUND) {
      return NAV_CORRECTION_TARGET_NOT_FOUND_KEY;
    }
    if (outcome.reason === NAVIGATION_REASON_PERMISSION_DENIED) {
      return NAV_CORRECTION_PERMISSION_DENIED_KEY;
    }
    if (outcome.reason === NAVIGATION_REASON_FEATURE_DISABLED) {
      return NAV_CORRECTION_FEATURE_DISABLED_KEY;
    }

    // A refusal without one of the known reasons never moved the browser at all (an invented
    // route outside the workplace prefix). Claiming the page is open would be a fresh false claim.
    return null;
  }

  // Every branch is named explicitly rather than falling through to permission-denied: an
  // else-branch here would keep showing the user the honest feature sentence while quietly
  // recording a rights problem, and the telemetry is what the miss rate is measured on.
  private outcomeKindFor(outcome: NavigationResult, target?: string): string | null {
    if (outcome.success) {
      return target ? NAVIGATION_OUTCOME_SCROLLED : null;
    }
    if (outcome.reason === NAVIGATION_REASON_TARGET_NOT_FOUND) {
      return NAVIGATION_OUTCOME_TARGET_MISS;
    }
    if (outcome.reason === NAVIGATION_REASON_FEATURE_DISABLED) {
      return NAVIGATION_OUTCOME_FEATURE_DISABLED;
    }
    return NAVIGATION_OUTCOME_PERMISSION_DENIED;
  }

  private appendCorrection(messageId: string, translationKey: string): void {
    const sentence = this.translate.instant(translationKey);
    if (!sentence || sentence === translationKey) return;

    const message = this.orchestrator.messages().find((m) => m.id === messageId);
    if (!message) return;
    if (message.content?.includes(sentence)) return;

    const merged = message.content ? `${message.content}\n\n${sentence}` : sentence;
    this.orchestrator.updateMessage(messageId, {
      content: merged,
      formattedContent: formatMessage(merged),
    });

    this.orchestrator.speakFollowUpSentence(sentence);
    this.correctionAppendedSubject.next();
  }
}
