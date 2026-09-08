// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Root-provided service for the per-message actions of the Klacksy chat (feedback,
 * correction, proactive reactions, mute/delegate/acknowledge, dismiss and speak-aloud),
 * together with the shared pending/menu state those actions read and write. It also owns the
 * whole "while you were away" inbox pipeline: loading unread rows, materializing them into
 * ConversationOrchestratorService messages, reacting to live SignalR pushes, and the
 * inbox-block actions (expand/collapse, hide all). It exists so a second surface (the
 * proactive-inbox overlay card, which the chat component is not mounted for in the floating
 * output modes) can read the same list and trigger the same actions on the same state as the
 * chat. This also fixes a chicken-and-egg bug: the card renders only once inboxMessages() is
 * non-empty, so if loading were owned by a component instead of this root-scoped singleton,
 * nothing might ever be mounted to trigger the first load (the same class of bug the
 * goal-candidates card hit before AssistantPanelsComponent grew its own load-trigger effect;
 * here there is exactly one trigger for both surfaces instead of one per surface, which is also
 * what keeps a simultaneously-active chat and card from loading the inbox twice in parallel).
 * The inbox derivation and pipeline live here rather than on DataManagementProactiveInboxService
 * because they need ConversationOrchestratorService and the ChatMessage type, both
 * presentation-layer - the domain layer may not depend on them.
 * @param correctionMenuMessageId - Id of the message whose "not helpful" correction menu is open
 * @param dismissMenuMessageId - Id of the proactive message whose dismiss-reason menu is open
 * @param pendingReactionMessageId - Id of the proactive message with an in-flight reaction request
 * @param pendingMuteMessageId - Id of the mute-suggestion message with an in-flight mute request
 * @param pendingDelegateMessageId - Id of the proactive message with an in-flight delegate request
 * @param pendingAcknowledgeMessageId - Id of the proactive message with an in-flight acknowledge request
 */
import { Injectable, computed, effect, inject, signal, DestroyRef, NgZone } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Subject, debounceTime, firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementProactiveInboxService } from 'src/app/domain/services/assistant/data-management-proactive-inbox.service';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { TextToSpeechService } from 'src/app/presentation/aside/assistant-chat/services/text-to-speech.service';
import { ChatMessage } from 'src/app/presentation/aside/assistant-chat/chat-message.interface';
import {
  ISubmitCorrectionRequest,
  ISubmitHelpfulFeedbackRequest,
} from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { IProactiveInboxItem } from 'src/app/domain/interfaces/proactive-inbox.interface';
import {
  MUTE_SUGGESTION_KIND_PARAM,
  PROACTIVE_TRIGGER_KIND,
} from 'src/app/domain/constants/proactive-trigger-kinds.constants';
import { PROACTIVE_MAX_ACTION } from 'src/app/domain/constants/proactive-max-action.constants';
import {
  PROACTIVE_REACTION,
  ProactiveReaction,
  ProactiveRejectReason,
} from 'src/app/domain/constants/proactive-reaction.constants';
import { stripMetadataMarkers, stripForTts, formatMessage } from 'src/app/shared/helpers/assistant-text.helper';

export type CorrectionType = 'wrong_skill' | 'wrong_param' | 'none_needed';

const PROACTIVE_REACTION_ERROR_KEY = 'assistant-chat.error.generic';
const PROACTIVE_MUTE_CONFIRMED_KEY = 'assistant-chat.proactive.mute-confirmed';
const PROACTIVE_DELEGATE_CONFIRMED_KEY = 'assistant-chat.proactive.delegate-confirmed';
const PROACTIVE_DELEGATE_FORBIDDEN_KEY = 'assistant-chat.proactive.delegate-forbidden';
const PROACTIVE_I18N_MARKER = 'i18n:';
const INBOX_RELOAD_DEBOUNCE_MS = 250;
export const SETUP_CONSULTATION_TRIGGER_PHRASE_KEY = 'setupConsultation.triggerPhrase';

@Injectable({ providedIn: 'root' })
export class ChatMessageActionsService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly assistantService = inject(DataManagementAssistantService);
  private readonly proactiveInboxService = inject(DataManagementProactiveInboxService);
  private readonly translateService = inject(TranslateService);
  private readonly languageMappingService = inject(LanguageMappingService);
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly ttsService = inject(TextToSpeechService);
  private readonly klacksyNavigation = inject(KlacksyNavigationService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly asideService = inject(AsideService);
  private readonly onboardingService = inject(OnboardingService);
  private readonly assistantSignalR = inject(AssistantSignalRService);

  private inboxLoadRequested = false;
  private readonly inboxReloadRequests$ = new Subject<void>();

  constructor() {
    // A live push carries no content of its own: the trigger pipeline persists the inbox row
    // before it delivers (AgentTriggerService), so the row - not the push payload - is the
    // single source. The push only says "the inbox changed", the reload renders it.
    this.assistantSignalR.proactiveMessage$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ngZone.run(() => this.onProactivePushReceived()));

    this.assistantSignalR.proactiveInboxChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ngZone.run(() => this.onInboxUnreadCountChanged()));

    this.inboxReloadRequests$
      .pipe(debounceTime(INBOX_RELOAD_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadProactiveInbox());

    // Root-scoped on purpose: this is the single trigger for both surfaces (chat and the
    // overlay-rail inbox card), not one trigger per surface. Two independent per-component
    // triggers would either race (both loading in parallel while the aside is open) or leave a
    // gap where neither has mounted yet to fire the first load - the inbox card only renders
    // once inboxMessages() is non-empty, so without this it can never load its own first page.
    effect(() => {
      if (!this.asideService.isVisible()) {
        this.inboxLoadRequested = false;
        return;
      }
      if (this.onboardingService.isTourActive() || this.inboxLoadRequested) {
        return;
      }
      this.inboxLoadRequested = true;
      this.loadProactiveInbox();
    });
  }

  private onProactivePushReceived(): void {
    if (this.canPresentInbox()) {
      this.inboxReloadRequests$.next();
      return;
    }
    // The live-push branch sends no unread-count signal, so the badge would miss this row.
    this.proactiveInboxService.refreshUnreadCount();
  }

  private onInboxUnreadCountChanged(): void {
    if (this.canPresentInbox()) {
      this.inboxReloadRequests$.next();
    }
  }

  private canPresentInbox(): boolean {
    return this.asideService.isVisible() && !this.onboardingService.isTourActive();
  }

  loadProactiveInbox(): void {
    this.proactiveInboxService
      .loadUnreadMessages()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.ngZone.run(() => this.presentInboxMessages(items)),
        error: () => undefined,
      });
  }

  private presentInboxMessages(items: IProactiveInboxItem[]): void {
    if (items.length === 0) {
      return;
    }
    const knownMessages = new Map(this.orchestrator.messages().map((message) => [message.id, message]));
    // A reminder is the same inbox row with a higher reminder count and its read state
    // reset, so it updates the existing bubble in place instead of appending a duplicate.
    // The order stays as rendered (by CreateTime); only the row's own fields change.
    const remindedItems = items.filter((item) => {
      const known = knownMessages.get(item.id);
      return known !== undefined && (item.reminderCount ?? 0) > (known.proactiveReminderCount ?? 0);
    });
    for (const item of remindedItems) {
      const refreshed = this.toInboxChatMessage(item);
      this.orchestrator.updateMessage(item.id, {
        content: refreshed.content,
        formattedContent: refreshed.formattedContent,
        proactiveReminderCount: refreshed.proactiveReminderCount,
        proactiveAcknowledged: refreshed.proactiveAcknowledged,
      });
    }
    if (remindedItems.length > 0) {
      // A hide from before the reminder must not swallow the re-sent row for the rest
      // of the session.
      this.proactiveInboxService.unhideMessages(remindedItems.map((item) => item.id));
    }
    const freshItems = items.filter((item) => !knownMessages.has(item.id));
    if (freshItems.length > 0) {
      const inboxChatMessages = freshItems.map((item) => this.toInboxChatMessage(item));
      this.orchestrator.replaceMessages([...this.orchestrator.messages(), ...inboxChatMessages]);
      this.proactiveInboxService.setInboxHeadingIfUnset(inboxChatMessages[0].id);
      this.proactiveInboxService.addToInboxBlock(inboxChatMessages.map((message) => message.id));
      // A row the user dismissed earlier must not come back as a dead one whose buttons
      // are already spent.
      this.proactiveInboxService.markHidden(
        inboxChatMessages
          .filter((message) => message.proactiveReaction === PROACTIVE_REACTION.Dismissed)
          .map((message) => message.id),
      );
    }
    // Being shown is not the same as being handled: a row only counts as read once the user
    // consciously dismisses it (per-row "Ausblenden" or the "Alle ausblenden" bulk action), so
    // merely loading or expanding the block must never mark anything read on its own.
    this.proactiveInboxService.refreshUnreadCount();
  }

  private toInboxChatMessage(item: IProactiveInboxItem): ChatMessage {
    const content = this.resolveProactiveContent(item.content, item.contentParams);
    return {
      id: item.id,
      sender: 'assistant',
      content,
      formattedContent: formatMessage(content),
      timestamp: new Date(item.createdUtc),
      messageKind: 'proactive',
      proactiveReaction: this.toProactiveReaction(item.reaction),
      proactiveSeverity: item.severity ?? undefined,
      proactiveCanDelegate: item.canDelegate ?? false,
      proactiveReminderCount: item.reminderCount ?? 0,
      proactiveAcknowledged: !!item.acknowledgedAtUtc,
      ...this.toProactiveActionFields(item.kind, item.actionRoute, item.actionParams, item.contentParams),
    };
  }

  private toProactiveActionFields(
    kind: string | null | undefined,
    actionRoute: string | null | undefined,
    actionParams: Record<string, string> | null | undefined,
    contentParams: Record<string, string> | undefined,
  ): Partial<ChatMessage> {
    return {
      proactiveKind: kind ?? undefined,
      proactiveActionRoute: actionRoute ?? undefined,
      proactiveActionParams: actionParams ?? undefined,
      proactiveMuteTargetKind:
        kind === PROACTIVE_TRIGGER_KIND.MuteSuggestion
          ? contentParams?.[MUTE_SUGGESTION_KIND_PARAM]
          : undefined,
    };
  }

  private toProactiveReaction(reaction?: string | null): ProactiveReaction | undefined {
    const normalized = reaction?.toLowerCase();
    return normalized === PROACTIVE_REACTION.Helpful || normalized === PROACTIVE_REACTION.Dismissed
      ? normalized
      : undefined;
  }

  private resolveProactiveContent(text: string, params?: Record<string, string>): string {
    const stripped = stripMetadataMarkers(text);
    if (stripped.startsWith(PROACTIVE_I18N_MARKER)) {
      return this.translateService.instant(stripped.slice(PROACTIVE_I18N_MARKER.length), params);
    }
    return stripped;
  }

  private readonly _correctionMenuMessageId = signal<string | null>(null);
  private readonly _dismissMenuMessageId = signal<string | null>(null);
  private readonly _pendingReactionMessageId = signal<string | null>(null);
  private readonly _pendingMuteMessageId = signal<string | null>(null);
  private readonly _pendingDelegateMessageId = signal<string | null>(null);
  private readonly _pendingAcknowledgeMessageId = signal<string | null>(null);

  readonly correctionMenuMessageId = this._correctionMenuMessageId.asReadonly();
  readonly dismissMenuMessageId = this._dismissMenuMessageId.asReadonly();
  readonly pendingReactionMessageId = this._pendingReactionMessageId.asReadonly();
  readonly pendingMuteMessageId = this._pendingMuteMessageId.asReadonly();
  readonly pendingDelegateMessageId = this._pendingDelegateMessageId.asReadonly();
  readonly pendingAcknowledgeMessageId = this._pendingAcknowledgeMessageId.asReadonly();

  // The heading used to ride on the first row still showing in the chat's own message flow, so
  // hiding the row it sat above moved it down instead of taking the whole block with it. That
  // anchor concept is gone now that the block no longer renders inline - both surfaces just need
  // the filtered list itself.
  readonly inboxMessages = computed<ChatMessage[]>(() => {
    const ids = this.proactiveInboxService.inboxMessageIds();
    const hidden = this.proactiveInboxService.hiddenMessageIds();
    return this.orchestrator.messages().filter((message) => ids.has(message.id) && !hidden.has(message.id));
  });

  hideWholeInbox(): void {
    this.proactiveInboxService.hideMessages(this.inboxMessages().map((message) => message.id));
  }

  toggleInboxExpanded(): void {
    this.proactiveInboxService.toggleInboxExpanded();
  }

  isMuteSuggestion(message: ChatMessage): boolean {
    return message.proactiveKind === PROACTIVE_TRIGGER_KIND.MuteSuggestion;
  }

  isSetupNotice(message: ChatMessage): boolean {
    return message.proactiveKind === PROACTIVE_TRIGGER_KIND.NoScheduleYet;
  }

  /**
   * Start the setup consultation from a proactive no_schedule_yet message. The notice asks whether
   * to show the user how to begin, but its action button only navigates — and a plain "yes" reply
   * matches no recipe trigger, so the offer would lead nowhere. Sending the recipe's own trigger
   * phrase as a message is what actually starts the guided flow.
   * @param message - The proactive message the button belongs to
   */
  startSetupConsultation(message: ChatMessage): void {
    if (message.proactiveKind !== PROACTIVE_TRIGGER_KIND.NoScheduleYet) {
      return;
    }
    void this.orchestrator.submitText(this.translateService.instant(SETUP_CONSULTATION_TRIGGER_PHRASE_KEY));
  }

  toggleDismissMenu(messageId: string): void {
    const current = this._dismissMenuMessageId();
    this._dismissMenuMessageId.set(current === messageId ? null : messageId);
  }

  /**
   * Hide the message and say why. The reason is what turns a dismissal into feedback Klacksy can act
   * on, so the menu offers "no reason" as a fourth choice rather than letting the button dismiss
   * silently: a user who does not want to explain still closes the row in one further click, and the
   * backend can tell that answer apart from a client that never asked.
   * @param message - The proactive message being dismissed
   * @param rejectReason - The reason the user picked
   */
  dismissProactiveMessage(message: ChatMessage, rejectReason: ProactiveRejectReason): void {
    this._dismissMenuMessageId.set(null);
    this.proactiveInboxService.dismissMessage(message.id, rejectReason);
  }

  onProactiveActionClick(message: ChatMessage): void {
    if (!message.proactiveActionRoute) {
      return;
    }
    const url = this.buildActionUrl(message.proactiveActionRoute, message.proactiveActionParams);
    void this.klacksyNavigation.navigateAndScroll(url);
  }

  private buildActionUrl(route: string, params?: Record<string, string>): string {
    if (!params || Object.keys(params).length === 0) {
      return route;
    }
    const query = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    return `${route}?${query}`;
  }

  /**
   * Mute the suggested trigger kind. Muting IS an acknowledgement on the backend (F1), which stamps
   * every still open message of that kind as acknowledged. Nothing reloads the inbox afterwards, so
   * the same truth is applied in place here - otherwise the settled messages would keep offering an
   * "Erledigt" button until the next reload.
   * @param message - The mute-suggestion message whose target kind is muted
   */
  async submitMuteSuggestion(message: ChatMessage): Promise<void> {
    if (message.messageKind !== 'proactive' || message.proactiveMuted) return;
    if (!message.proactiveMuteTargetKind) return;
    if (this._pendingMuteMessageId() !== null) return;

    const mutedKind = message.proactiveMuteTargetKind;
    this._pendingMuteMessageId.set(message.id);
    try {
      await firstValueFrom(this.assistantService.muteTriggerKind(mutedKind));
      this.orchestrator.updateMessage(message.id, { proactiveMuted: true });
      this.markKindAcknowledged(mutedKind);
      this.toastShowService.showInfo(
        this.translateService.instant(PROACTIVE_MUTE_CONFIRMED_KEY),
      );
    } catch {
      this.toastShowService.showError(
        this.translateService.instant(PROACTIVE_REACTION_ERROR_KEY),
      );
    } finally {
      this._pendingMuteMessageId.set(null);
    }
  }

  private markKindAcknowledged(triggerKind: string): void {
    for (const candidate of this.orchestrator.messages()) {
      if (candidate.proactiveKind === triggerKind && !candidate.proactiveAcknowledged) {
        this.orchestrator.updateMessage(candidate.id, { proactiveAcknowledged: true });
      }
    }
  }

  /**
   * "Mach du": grants Klacksy a one-off Prepare-level permission for this one finding, ahead of
   * whatever the trigger kind's own governance currently allows (Etappe 4e). Only ever advances
   * Prepare in this stage - Execute has no effect before Etappe 5's autonomy gate exists, so the
   * button does not offer it.
   * @param message - The proactive message reporting the finding to delegate
   */
  async submitDelegate(message: ChatMessage): Promise<void> {
    if (message.messageKind !== 'proactive' || message.proactiveDelegated) return;
    if (!message.proactiveCanDelegate) return;
    if (this._pendingDelegateMessageId() !== null) return;

    this._pendingDelegateMessageId.set(message.id);
    try {
      await firstValueFrom(this.assistantService.delegateCondition(message.id, PROACTIVE_MAX_ACTION.Prepare));
      this.orchestrator.updateMessage(message.id, { proactiveDelegated: true });
      this.toastShowService.showInfo(
        this.translateService.instant(PROACTIVE_DELEGATE_CONFIRMED_KEY),
      );
    } catch (error) {
      const key =
        error instanceof HttpErrorResponse && error.status === HttpStatusCode.Forbidden
          ? PROACTIVE_DELEGATE_FORBIDDEN_KEY
          : PROACTIVE_REACTION_ERROR_KEY;
      this.toastShowService.showError(this.translateService.instant(key));
    } finally {
      this._pendingDelegateMessageId.set(null);
    }
  }

  speakMessage(message: ChatMessage): void {
    this.orchestrator.stopAutoSpeak();
    const currentLang = this.translateService.currentLang || this.translateService.defaultLang;
    const locale = this.languageMappingService.getSpeechLocale(currentLang);
    const cleaned = stripForTts(stripMetadataMarkers(message.content));
    this.ttsService.speak(cleaned, message.id, locale);
  }

  private toggleCorrectionMenu(messageId: string): void {
    const current = this._correctionMenuMessageId();
    this._correctionMenuMessageId.set(current === messageId ? null : messageId);
  }

  /**
   * The thumbs-down itself is the verdict (W1.8): the coarse "not helpful" is sent the moment the
   * button is pressed, not when the user finishes picking a reason, because most users never do.
   * The menu that opens afterwards only refines the verdict with a correction type or free text.
   * Only closing the menu is silent - a repeated thumbs-down after a thumbs-up must reach the
   * backend, whose handler lets the last judgement win and absorbs duplicates itself.
   * @param message - The assistant message the user gave a thumbs-down
   */
  onNotHelpfulClick(message: ChatMessage): void {
    const wasOpen = this._correctionMenuMessageId() === message.id;
    this.toggleCorrectionMenu(message.id);

    if (wasOpen || !message.respondedToUserMessage) return;

    this.sendNotHelpful(message);
  }

  /**
   * Sends the free text the user typed with the thumbs-down. The backend overwrites the comment of
   * the same turn, so a second send simply refines the first one.
   * @param message - The assistant message the user gave a thumbs-down
   * @param comment - Free text; an empty box just closes the menu without a pointless request
   */
  submitNotHelpfulComment(message: ChatMessage, comment: string): void {
    const trimmed = comment.trim();
    if (!message.respondedToUserMessage || !trimmed) {
      this._correctionMenuMessageId.set(null);
      return;
    }

    this.sendNotHelpful(message, trimmed);
  }

  private sendNotHelpful(message: ChatMessage, comment?: string): void {
    const request: ISubmitHelpfulFeedbackRequest = {
      userMessage: message.respondedToUserMessage!,
      helpful: false,
      comment,
    };

    this.assistantService
      .submitHelpfulFeedback(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.orchestrator.updateMessage(message.id, {
              notHelpfulSubmitted: true,
              notHelpfulCommentSubmitted: comment ? true : message.notHelpfulCommentSubmitted,
            });
            if (comment) {
              this._correctionMenuMessageId.set(null);
            }
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.toastShowService.showError(
              this.translateService.instant(PROACTIVE_REACTION_ERROR_KEY),
            );
          });
        },
      });
  }

  /**
   * Records that this answer helped. The response's found flag is deliberately ignored: whether trajectory
   * capture still had the turn to attach the mark to is nothing the user can act on. A failed request is
   * different and is reported, because otherwise the click would do nothing visible at all.
   * @param message - The assistant message the user gave a thumbs-up
   */
  submitHelpfulFeedback(message: ChatMessage): void {
    if (!message.respondedToUserMessage || message.helpfulSubmitted) return;

    const request: ISubmitHelpfulFeedbackRequest = {
      userMessage: message.respondedToUserMessage,
    };

    this.assistantService
      .submitHelpfulFeedback(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.orchestrator.updateMessage(message.id, { helpfulSubmitted: true });
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.toastShowService.showError(
              this.translateService.instant(PROACTIVE_REACTION_ERROR_KEY),
            );
          });
        },
      });
  }

  submitCorrection(message: ChatMessage, correctionType: CorrectionType): void {
    if (!message.respondedToUserMessage || message.correctionSubmitted) return;

    const request: ISubmitCorrectionRequest = {
      userMessage: message.respondedToUserMessage,
      correctionType,
    };

    this.assistantService
      .submitCorrection(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.orchestrator.updateMessage(message.id, { correctionSubmitted: true });
            this._correctionMenuMessageId.set(null);
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this._correctionMenuMessageId.set(null);
          });
        },
      });
  }

  async submitProactiveReaction(message: ChatMessage, reaction: ProactiveReaction): Promise<void> {
    if (message.messageKind !== 'proactive' || message.proactiveReaction) return;
    if (this._pendingReactionMessageId() !== null) return;

    this._pendingReactionMessageId.set(message.id);
    try {
      await firstValueFrom(this.assistantService.setProactiveReaction(message.id, reaction));
      this.orchestrator.updateMessage(message.id, { proactiveReaction: reaction });
    } catch {
      this.toastShowService.showError(
        this.translateService.instant(PROACTIVE_REACTION_ERROR_KEY),
      );
    } finally {
      this._pendingReactionMessageId.set(null);
    }
  }

  /**
   * "Erledigt": acknowledges the message server-side, which stops the reminder backoff
   * for this row. Locked like the reaction buttons — one flight at a time, and a failed
   * request only shows a toast so the button stays live for a retry.
   * @param message - The proactive message the user marked as done
   */
  async submitAcknowledge(message: ChatMessage): Promise<void> {
    if (message.messageKind !== 'proactive' || message.proactiveAcknowledged) return;
    if (this._pendingAcknowledgeMessageId() !== null) return;

    this._pendingAcknowledgeMessageId.set(message.id);
    try {
      await firstValueFrom(this.proactiveInboxService.acknowledgeMessage(message.id));
      this.orchestrator.updateMessage(message.id, { proactiveAcknowledged: true });
    } catch {
      this.toastShowService.showError(
        this.translateService.instant(PROACTIVE_REACTION_ERROR_KEY),
      );
    } finally {
      this._pendingAcknowledgeMessageId.set(null);
    }
  }
}
