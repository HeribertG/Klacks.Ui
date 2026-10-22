// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Interactive reply toasts of one assistant chat instance: suggested replies, action suggestions and
 * the greeting options (including the welcome focus action and its "later"), plus the greeting toast
 * that waits until the panel becomes visible. A picked option is sent as chat text or navigated to; a focus
 * action of kind "prompt" sends its translated request (e.g. the seal request) as chat text.
 * @param config - Suggested-replies configuration from the stream metadata
 * @param focus - Welcome focus whose action or snooze a greeting option may trigger
 */
import { Injectable, NgZone, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { WelcomeGreetingService } from 'src/app/application/services/welcome-greeting.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { ISuggestedReply } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-replies-config.interface';
import { IWelcomeFocus } from 'src/app/domain/models/assistant/welcome-focus.interface';
import {
  WELCOME_FOCUS_ACTION,
  WELCOME_FOCUS_ACTION_KIND,
  WELCOME_FOCUS_FALLBACK_PROMPT_KEY,
  WELCOME_FOCUS_LATER,
} from 'src/app/domain/constants/welcome-focus.constants';
import { WORKPLACE_ROUTE_PREFIX } from 'src/app/domain/constants/navigation-outcome.constants';
import { ChatComposerService } from './chat-composer.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { SETUP_CONSULTATION_TRIGGER_PHRASE_KEY } from './chat-message-actions.service';
import { SINGLE_SELECTION_MODE } from './chat-reply-toast.constants';
import { parseNavigationOptionValue } from 'src/app/domain/helpers/navigation-option-value.helper';

const REPLY_VALUES_SEPARATOR = ', ';
const OPEN_ROUTE_ICON = '📍 ';
const OPEN_ROUTE_LABEL_KEY = 'assistant-chat.open';
const ACTION_TOAST_PROMPT_KEY = 'assistant-chat.action-toast.prompt';
const SNOOZE_FAILED_LOG = 'Snoozing the welcome focus kind failed';

@Injectable()
export class ChatReplyToastService {
  private readonly toastShowService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);
  private readonly onboarding = inject(OnboardingService);
  private readonly welcomeGreetingService = inject(WelcomeGreetingService);
  private readonly klacksyNavigation = inject(KlacksyNavigationService);
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly composer = inject(ChatComposerService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private pendingGreetingOptions: ISuggestedReply[] = [];
  private pendingGreetingPrompt: string | null = null;
  private pendingGreetingFocus: IWelcomeFocus | null = null;

  onSuggestionClick(suggestion: string): void {
    void this.composer.submit(suggestion);
  }

  onNavigateClick(navigateTo: string): void {
    if (!navigateTo.startsWith(WORKPLACE_ROUTE_PREFIX)) {
      return;
    }
    const destination = parseNavigationOptionValue(navigateTo);
    void this.klacksyNavigation.navigateAndScroll(destination.route, destination.target);
  }

  showRepliesAsToast(config: ISuggestedRepliesConfig): void {
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(
      config,
      (values: string[]) => {
        this.ngZone.run(() => {
          if (values.length === 0) return;
          void this.composer.submit(values.join(REPLY_VALUES_SEPARATOR));
        });
      },
    );
  }

  /**
   * Shows the action suggestions (and an "open" entry for an offerable route) as one toast. During a
   * tour the toast is suppressed but nothing is dismissed: the station chips are the only interactive
   * toast up while the tour runs, and the no-api-key welcome branch reaches this right in the middle of it.
   * @param suggestions - Plain suggestion texts, sent as chat text when picked
   * @param navigateTo - Route offered as an "open" entry, null when nothing is offerable
   */
  showActionsAsToast(suggestions?: string[], navigateTo?: string | null): void {
    if (this.onboarding.isTourActive()) {
      return;
    }
    const options = this.buildActionOptions(suggestions, navigateTo);
    if (options.length === 0) {
      this.toastShowService.dismissInteractiveReplies();
      return;
    }
    const config: ISuggestedRepliesConfig = {
      selectionMode: SINGLE_SELECTION_MODE,
      prompt: this.translateService.instant(ACTION_TOAST_PROMPT_KEY),
      options,
    };
    this.toastShowService.showInteractiveReply(config, (values: string[]) => {
      this.ngZone.run(() => {
        if (values.length === 0) return;
        this.openOrSend(values[0]);
      });
    });
  }

  /**
   * Shows the greeting options. The welcome response lands after the tour has already put its station
   * chips up, and dismissing here would take those chips down; suppressing the greeting is enough - a
   * greeting toast from before the tour is cleared by the station chips anyway.
   * @param options - Greeting options, possibly led by the welcome focus action and "later"
   * @param prompt - Toast headline, falls back to the generic welcome focus prompt
   * @param focus - Welcome focus the action and "later" options refer to
   */
  showGreetingOptionsAsToast(options: ISuggestedReply[], prompt?: string, focus?: IWelcomeFocus | null): void {
    if (!options.length) return;
    if (this.onboarding.isTourActive()) {
      return;
    }
    const config: ISuggestedRepliesConfig = {
      selectionMode: SINGLE_SELECTION_MODE,
      prompt: prompt ?? this.translateService.instant(WELCOME_FOCUS_FALLBACK_PROMPT_KEY),
      options,
    };
    this.toastShowService.showInteractiveReply(config, (values: string[]) => {
      this.ngZone.run(() => {
        if (values.length === 0) return;
        this.handleGreetingChoice(values[0], focus);
      });
    });
  }

  /**
   * Keeps the greeting options until the panel becomes visible, see showDeferredGreeting.
   * @param options - Greeting options to show later
   * @param prompt - Toast headline, null for the generic prompt
   * @param focus - Welcome focus the options refer to
   */
  deferGreeting(options: ISuggestedReply[], prompt: string | null, focus: IWelcomeFocus | null): void {
    this.pendingGreetingOptions = options;
    this.pendingGreetingPrompt = prompt;
    this.pendingGreetingFocus = focus;
  }

  showDeferredGreeting(): void {
    if (this.pendingGreetingOptions.length === 0) {
      return;
    }
    this.showGreetingOptionsAsToast(
      this.pendingGreetingOptions,
      this.pendingGreetingPrompt ?? undefined,
      this.pendingGreetingFocus,
    );
    this.dropPendingGreetingToast();
  }

  dropPendingGreetingToast(): void {
    this.pendingGreetingOptions = [];
    this.pendingGreetingPrompt = null;
    this.pendingGreetingFocus = null;
  }

  private buildActionOptions(suggestions?: string[], navigateTo?: string | null): ISuggestedReply[] {
    const options: ISuggestedReply[] = [];
    if (navigateTo && navigateTo.startsWith(WORKPLACE_ROUTE_PREFIX)) {
      options.push({
        label: OPEN_ROUTE_ICON + this.translateService.instant(OPEN_ROUTE_LABEL_KEY),
        value: navigateTo,
      });
    }
    if (suggestions) {
      for (const s of suggestions) {
        options.push({ label: s, value: s });
      }
    }
    return options;
  }

  private handleGreetingChoice(value: string, focus?: IWelcomeFocus | null): void {
    if (focus && value === WELCOME_FOCUS_ACTION) {
      this.runWelcomeFocusAction(focus);
      return;
    }
    if (focus && value === WELCOME_FOCUS_LATER) {
      this.snoozeWelcomeFocusKind(focus);
      return;
    }
    this.openOrSend(value);
  }

  private openOrSend(value: string): void {
    if (value.startsWith(WORKPLACE_ROUTE_PREFIX)) {
      this.onNavigateClick(value);
    } else {
      this.onSuggestionClick(value);
    }
  }

  private runWelcomeFocusAction(focus: IWelcomeFocus): void {
    if (focus.actionKind === WELCOME_FOCUS_ACTION_KIND.Consultation) {
      void this.orchestrator.submitText(
        this.translateService.instant(SETUP_CONSULTATION_TRIGGER_PHRASE_KEY),
      );
      return;
    }
    if (focus.actionKind === WELCOME_FOCUS_ACTION_KIND.Prompt && focus.actionPromptKey) {
      void this.orchestrator.submitText(this.translateService.instant(focus.actionPromptKey));
      return;
    }
    if (focus.actionRoute) {
      this.klacksyNavigation.navigateAndScroll(focus.actionRoute);
    }
  }

  private snoozeWelcomeFocusKind(focus: IWelcomeFocus): void {
    this.welcomeGreetingService
      .snoozeFocusKind(focus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error: unknown) => {
          console.error(SNOOZE_FAILED_LOG, error);
        },
      });
  }
}
