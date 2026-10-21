// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Welcome message of one assistant chat instance: the i18n placeholder, its replacement by the
 * backend greeting, the greeting options toast (shown right away or once the panel is visible) and
 * the hand-over of the welcome's onboarding state to the tour.
 * @param langCode - UI language the greeting is rendered in; decides the name-slot separator
 */
import { DestroyRef, Injectable, Injector, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { WelcomeGreetingService } from 'src/app/application/services/welcome-greeting.service';
import { LanguageMappingService } from 'src/app/application/services/language-mapping.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { WelcomeFocusToastService } from 'src/app/domain/services/assistant/welcome-focus-toast.service';
import { IWelcomeResponse } from 'src/app/domain/models/assistant/welcome.interface';
import { ISuggestedReply } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { formatMessage, stripMetadataMarkers } from 'src/app/shared/helpers/assistant-text.helper';
import { AsideService } from '../../aside.service';
import { createChatMessageId } from '../chat-ids.helper';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { ChatTranscriptService } from './chat-transcript.service';
import { ChatReplyToastService } from './chat-reply-toast.service';
import { ChatOnboardingTourService } from './chat-onboarding-tour.service';
import { ChatModelSelectionService } from './chat-model-selection.service';
import { ChatAutoSpeakService } from './chat-auto-speak.service';

const WELCOME_CONTENT_KEY = 'assistant-chat.welcome.content';
const WELCOME_SUGGESTION_KEYS = [
  'assistant-chat.welcome.suggestion-1',
  'assistant-chat.welcome.suggestion-2',
  'assistant-chat.welcome.suggestion-3',
  'assistant-chat.welcome.suggestion-4',
];
const SPACE_SEPARATED_NAME_LANGUAGES = ['fr', 'it'];
const SPACE_NAME_SEPARATOR = ' ';
const COMMA_NAME_SEPARATOR = ', ';

@Injectable()
export class ChatWelcomeService {
  private readonly translateService = inject(TranslateService);
  private readonly welcomeGreetingService = inject(WelcomeGreetingService);
  private readonly languageMappingService = inject(LanguageMappingService);
  private readonly assistantProviderService = inject(DataManagementAssistantProviderService);
  private readonly welcomeFocusToast = inject(WelcomeFocusToastService);
  private readonly asideService = inject(AsideService);
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly transcript = inject(ChatTranscriptService);
  private readonly replyToasts = inject(ChatReplyToastService);
  private readonly tour = inject(ChatOnboardingTourService);
  private readonly modelSelection = inject(ChatModelSelectionService);
  private readonly autoSpeak = inject(ChatAutoSpeakService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private pendingGreetingMessageId: string | null = null;
  private greetingSpoken = false;
  private welcomeMessageId: string | null = null;
  private welcomeRequestedWithoutApiKey = false;
  private readonly pendingWelcomeLang = signal<string | null>(null);

  /**
   * Registers the greeting effect, adds the first welcome unless the panel opened with a context, and
   * registers the effect that adds a welcome deferred until the provider list is known.
   */
  connect(): void {
    effect(() => {
      if (this.asideService.isVisible() && !this.greetingSpoken && this.pendingGreetingMessageId) {
        const msg = this.orchestrator.messages().find((m) => m.id === this.pendingGreetingMessageId);
        if (msg) {
          this.autoSpeak.maybeAutoSpeak(msg);
          this.greetingSpoken = true;
          this.replyToasts.showDeferredGreeting();
        }
      }
    }, { injector: this.injector });

    if (!this.asideService.openedWithContext() && this.orchestrator.messages().length === 0) {
      this.addWelcomeMessage(this.languageMappingService.resolveUserLanguage());
    }

    effect(() => {
      if (!this.assistantProviderService.providersInitialized()) return;
      const lang = this.pendingWelcomeLang();
      if (lang === null) return;
      this.addWelcomeMessage(lang);
    }, { injector: this.injector });
  }

  /**
   * Greeting and action toast stay silent until the provider list is known: without a configured
   * API key Klacksy cannot answer anything, so an inviting greeting would be misleading. The
   * welcome request itself still runs — it is the only source of the onboarding state, which the
   * fresh-install case (no key yet) needs most.
   * @param langCode - UI language of the greeting
   */
  addWelcomeMessage(langCode: string): void {
    if (!this.assistantProviderService.providersInitialized()) {
      this.pendingWelcomeLang.set(langCode);
      return;
    }
    this.pendingWelcomeLang.set(null);

    const canGreet = !this.modelSelection.noApiKeyForSelectedModel();
    if (!canGreet && this.welcomeRequestedWithoutApiKey) return;
    this.welcomeRequestedWithoutApiKey = !canGreet;

    const messageId = canGreet ? createChatMessageId() : null;
    this.welcomeMessageId = messageId;

    if (messageId) {
      this.addPlaceholderWelcome(messageId);
    }

    this.welcomeGreetingService.fetchWelcome()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (!messageId) {
            this.tour.applyWelcomeOnboarding(response);
            return;
          }
          this.applyWelcomeResponse(messageId, response, langCode);
        },
        error: () => undefined,
      });
  }

  /**
   * Replaces the current welcome with one in the new language.
   * @param langCode - The language the UI just switched to
   */
  updateWelcomeMessage(langCode: string): void {
    const previousWelcomeId = this.welcomeMessageId;
    if (previousWelcomeId) {
      const current = this.orchestrator.messages();
      if (current.some((message) => message.id === previousWelcomeId)) {
        this.orchestrator.replaceMessages(current.filter((message) => message.id !== previousWelcomeId));
      }
    }
    this.addWelcomeMessage(langCode);
  }

  private addPlaceholderWelcome(messageId: string): void {
    const content = this.translateService.instant(WELCOME_CONTENT_KEY);
    const suggestions = WELCOME_SUGGESTION_KEYS.map((key) => this.translateService.instant(key));
    this.orchestrator.addMessage({
      id: messageId,
      sender: 'assistant',
      content,
      formattedContent: formatMessage(content),
      timestamp: new Date(),
      suggestions,
    });
    this.transcript.requestScrollToBottom();
    this.replyToasts.showActionsAsToast(suggestions);
  }

  private applyWelcomeResponse(messageId: string, response: IWelcomeResponse, langCode: string): void {
    const content = stripMetadataMarkers(this.resolveWelcomeContent(response, langCode));
    const suggestions = response.suggestionKeys
      .map((key) => this.translateService.instant(key))
      .filter((label) => typeof label === 'string' && label.length > 0);
    const greetingOptions = this.buildGreetingOptions(response);

    this.orchestrator.updateMessage(messageId, {
      content,
      formattedContent: formatMessage(content),
      suggestions,
    });
    this.transcript.requestScrollToBottom();

    const focus = response.focus ?? null;
    let toastPrompt: string | undefined;
    let toastOptions = greetingOptions;
    if (focus) {
      const built = this.welcomeFocusToast.build(focus, greetingOptions);
      toastPrompt = built.prompt;
      toastOptions = built.options;
    }

    if (this.asideService.isVisible()) {
      this.autoSpeak.maybeAutoSpeak(this.orchestrator.messages().find((m) => m.id === messageId));
      this.greetingSpoken = true;
      if (toastOptions.length > 0) {
        this.replyToasts.showGreetingOptionsAsToast(toastOptions, toastPrompt, focus);
      }
    } else {
      this.pendingGreetingMessageId = messageId;
      this.replyToasts.deferGreeting(toastOptions, toastPrompt ?? null, focus);
    }

    this.tour.applyWelcomeOnboarding(response);
  }

  private buildGreetingOptions(response: IWelcomeResponse): ISuggestedReply[] {
    const routes = response.suggestionRoutes ?? {};
    return response.suggestionKeys
      .map((key) => {
        const label = this.translateService.instant(key) as string;
        if (!label || !label.length) return null;
        return { label, value: routes[key] ?? label };
      })
      .filter((o): o is ISuggestedReply => o !== null);
  }

  private resolveWelcomeContent(response: IWelcomeResponse, langCode: string): string {
    if (response.greetingText && response.greetingText.trim().length > 0) {
      return response.greetingText;
    }

    const weekday = response.weekdayKey ? this.translateService.instant(response.weekdayKey) : '';
    const weather = response.weatherKey ? this.translateService.instant(response.weatherKey) : '';
    const name = this.formatNameSlot(response.displayName, langCode);

    const greeting = this.translateService.instant(response.greetingKey, {
      name,
      weekday,
      weather,
    });

    if (response.ambientKey) {
      const ambient = this.translateService.instant(response.ambientKey, {
        holiday: response.ambientHolidayName ?? '',
      });
      if (ambient && ambient !== response.ambientKey) {
        return `${greeting} ${ambient}`;
      }
    }

    return greeting;
  }

  private formatNameSlot(displayName: string | null | undefined, langCode: string): string {
    if (!displayName) return '';
    const separator = SPACE_SEPARATED_NAME_LANGUAGES.includes(langCode) ? SPACE_NAME_SEPARATOR : COMMA_NAME_SEPARATOR;
    return `${separator}${displayName}`;
  }
}
