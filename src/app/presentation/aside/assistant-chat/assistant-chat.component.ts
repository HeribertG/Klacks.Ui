// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Chat component for the Klacksy AI assistant sidebar.
 * @param messagesContainer - Scrollable message list element
 * @param chatInput - Textarea element for user text input
 */
import {
  Component,
  inject,
  HostListener,
  ElementRef,
  effect,
  NgZone,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
  afterEveryRender,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import {
  faMicrophone,
  faMicrophoneSlash,
  faPaperPlane,
  faUser,
  faChevronDown,
  faStop,
  faSpinner,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { Router } from '@angular/router';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import {
  NAVIGATION_CONTENT_KEY_PATTERN,
  WORKPLACE_ROUTE_PREFIX,
} from 'src/app/domain/constants/navigation-outcome.constants';
import { NavigationVerdictService } from './services/navigation-verdict.service';
import { EXPLAIN_PAGE_SKILL_PREFIX } from 'src/app/domain/constants/page-explain-icons.constants';
import { LanguageMappingService } from 'src/app/application/services/language-mapping.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { AsideService } from '../aside.service';
import { DataManagementAgentPlanService } from 'src/app/domain/services/assistant/data-management-agent-plan.service';
import { AssistantPanelsComponent } from './assistant-panels/assistant-panels.component';
import { AutonomyStatusBarComponent } from './autonomy-status-bar/autonomy-status-bar.component';
import { ChatMessageComponent } from './chat-message/chat-message.component';
import { ISuggestedReply } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ChatMessage } from './chat-message.interface';
import { ConversationOrchestratorService } from './services/conversation-orchestrator.service';
import { ConversationState } from './services/conversation-state.enum';
import { ChatStageStatusService } from './services/chat-stage-status.service';
import { ChatTurnControlService } from './services/chat-turn-control.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { isPrintableKey } from 'src/app/shared/helpers/keyboard.helper';
import { stripMetadataMarkers, stripForTts, formatMessage } from 'src/app/shared/helpers/assistant-text.helper';
import { SpeechOutputModeService } from 'src/app/application/services/speech-output-mode.service';
import { ChatFunctionExecutionService } from './services/chat-function-execution.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DataManagementProactiveInboxService } from 'src/app/domain/services/assistant/data-management-proactive-inbox.service';
import { ChatMessageActionsService } from './services/chat-message-actions.service';
import { ChatTranscriptService } from './services/chat-transcript.service';
import { ChatComposerService } from './services/chat-composer.service';
import { ChatAutoSpeakService } from './services/chat-auto-speak.service';
import { ChatModelSelectionService } from './services/chat-model-selection.service';
import { ChatReplyToastService } from './services/chat-reply-toast.service';
import { createChatMessageId, createConversationId } from './chat-ids.helper';
import { CorrectionType } from './services/correction-type.type';
import {
  ProactiveReaction,
  ProactiveRejectReason,
} from 'src/app/domain/constants/proactive-reaction.constants';
import { StreamMetadata } from 'src/app/domain/models/assistant/stream-metadata.interface';
import { StreamStatus } from 'src/app/domain/models/assistant/stream-status.interface';
import { WelcomeGreetingService } from 'src/app/application/services/welcome-greeting.service';
import { IWelcomeResponse } from 'src/app/domain/models/assistant/welcome.interface';
import { WelcomeFocusToastService } from 'src/app/domain/services/assistant/welcome-focus-toast.service';
import type { IVoiceShellErrorHint } from 'src/app/domain/models/assistant/voice-shell-error-hint.model';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { ChatOnboardingTourService } from './services/chat-onboarding-tour.service';

@Component({
  selector: 'app-assistant-chat',
  standalone: true,
  imports: [
    FormsModule,
    FontAwesomeModule,
    TranslateModule,
    AssistantPanelsComponent,
    AutonomyStatusBarComponent,
    ChatMessageComponent,
  ],
  templateUrl: './assistant-chat.component.html',
  styleUrls: ['./assistant-chat.component.scss'],
  providers: [
    AssistantFunctionExecutionService,
    ChatFunctionExecutionService,
    ChatTranscriptService,
    ChatComposerService,
    ChatModelSelectionService,
    ChatReplyToastService,
    ChatOnboardingTourService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantChatComponent {
  private readonly messagesContainer = viewChild.required<ElementRef>('messagesContainer');
  private readonly chatInput = viewChild<ElementRef<HTMLTextAreaElement>>('chatInput');

  private readonly transcript = inject(ChatTranscriptService);
  private readonly composer = inject(ChatComposerService);
  private readonly autoSpeak = inject(ChatAutoSpeakService);
  private readonly modelSelection = inject(ChatModelSelectionService);
  private readonly replyToasts = inject(ChatReplyToastService);
  private readonly tour = inject(ChatOnboardingTourService);
  private assistantService = inject(DataManagementAssistantService);
  private assistantProviderService = inject(DataManagementAssistantProviderService);
  private chatFunctionExecution = inject(ChatFunctionExecutionService);
  readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly chatStageStatus = inject(ChatStageStatusService);
  private readonly turnControl = inject(ChatTurnControlService);
  readonly ConversationState = ConversationState;
  private asideService = inject(AsideService);
  speechService = inject(SpeechRecognitionService);
  ttsService = inject(TextToSpeechService);
  private translateService = inject(TranslateService);
  private languageMappingService = inject(LanguageMappingService);
  private klacksyNavigation = inject(KlacksyNavigationService);
  private navigationVerdict = inject(NavigationVerdictService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  readonly proactiveInboxService = inject(DataManagementProactiveInboxService);
  private readonly messageActions = inject(ChatMessageActionsService);
  readonly planService = inject(DataManagementAgentPlanService);
  private toastShowService = inject(ToastShowService);
  private welcomeGreetingService = inject(WelcomeGreetingService);
  private readonly welcomeFocusToast = inject(WelcomeFocusToastService);
  private readonly outputModes = inject(SpeechOutputModeService);

  /** Whether output mode is audio-only — panels should show as floating toasts */
  /**
   * In a floating mode the assistant's surfaces live in the overlay rail, because there is no chat
   * panel on screen to hold them. isAudioOnlyMode was used here before and covered only 'audio',
   * so in 'both-auto' the plan panel rendered inline and in the rail at the same time.
   */
  readonly isFloatingOutputMode = this.outputModes.isFloatingMode;
  readonly onboarding = inject(OnboardingService);
  private readonly destroyRef = inject(DestroyRef);
  private eventBus = inject(EVENT_BUS_TOKEN);

  private pendingGreetingMessageId: string | null = null;
  private greetingSpoken = false;
  private welcomeMessageId: string | null = null;
  private welcomeRequestedWithoutApiKey = false;
  private readonly pendingWelcomeLang = signal<string | null>(null);

  faMicrophone = faMicrophone;
  faMicrophoneSlash = faMicrophoneSlash;
  faPaperPlane = faPaperPlane;
  faUser = faUser;
  faChevronDown = faChevronDown;
  faStop = faStop;
  faSpinner = faSpinner;

  readonly correctionMenuMessageId = this.messageActions.correctionMenuMessageId;
  readonly dismissMenuMessageId = this.messageActions.dismissMenuMessageId;
  readonly pendingReactionMessageId = this.messageActions.pendingReactionMessageId;
  readonly pendingMuteMessageId = this.messageActions.pendingMuteMessageId;
  readonly pendingDelegateMessageId = this.messageActions.pendingDelegateMessageId;
  readonly pendingAcknowledgeMessageId = this.messageActions.pendingAcknowledgeMessageId;

  readonly inputText = this.composer.inputText;
  /** Now backed by ChatTurnControlService: flips false the instant a stop begins, not only when the turn fully completes. */
  readonly isProcessing = this.turnControl.isTurnRunning;
  /** Pass-through of the extracted service's state; kept as a component member for template/spec compatibility. */
  readonly toolSteps = this.chatStageStatus.toolSteps;
  showModelDropdown = signal(false);

  readonly availableModels = this.modelSelection.availableModels;
  readonly currentModel = this.modelSelection.currentModel;
  readonly isInitializing = this.modelSelection.isInitializing;
  readonly hasNoApiKey = this.modelSelection.hasNoApiKey;

  readonly isTourActive = computed(() => this.onboarding.isTourActive());
  readonly onboardingCardKeys = this.tour.onboardingCardKeys;
  readonly isInputHiddenByTour = computed(() => this.onboarding.isTourActive() && !this.onboarding.isIntro());
  readonly displayedTourProgress = this.tour.displayedTourProgress;
  conversationId = '';
  private currentStreamController: AbortController | null = null;
  private currentRawStream = '';
  private streamBuffer = '';
  private streamRafHandle: number | null = null;
  private streamPreviousClean = '';
  private scrollMarkersDispatched = 0;
  private isCurrentTurnStopped: () => boolean = () => false;
  private sawFunctionCall = false;
  private fastPathNavigationTimer: ReturnType<typeof setTimeout> | null = null;

  private static readonly SCROLL_MARKER_REGEX = /\[SCROLL:\s*([\w-]+)\s*\]/gi;
  private static readonly FAST_PATH_NAVIGATE_DELAY_MS = 0;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.model-dropdown')) {
      this.showModelDropdown.set(false);
    }
  }

  constructor() {
    this.conversationId = createConversationId();
    this.composer.registerSender(() => this.sendMessage());
    this.transcript.registerInputFocus(() => this.chatInput()?.nativeElement?.focus());

    afterEveryRender(() => {
      if (this.transcript.consumeScrollRequest()) {
        this.scrollToBottom();
      }
    });

    effect(() => {
      if (this.asideService.isVisible() && !this.greetingSpoken && this.pendingGreetingMessageId) {
        const msg = this.orchestrator.messages().find(m => m.id === this.pendingGreetingMessageId);
        if (msg) {
          this.autoSpeak.maybeAutoSpeak(msg);
          this.greetingSpoken = true;
          this.replyToasts.showDeferredGreeting();
        }
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.streamRafHandle !== null) {
        cancelAnimationFrame(this.streamRafHandle);
        this.streamRafHandle = null;
      }
      this.ttsService.stop();
      this.chatStageStatus.clear();
    });

    this.turnControl.registerHooks({
      silence: () => {
        this.ttsService.interrupt();
        this.orchestrator.stopAutoSpeak();
      },
      hardAbort: () => this.hardAbortStream(),
      hadToolSteps: () => this.sawFunctionCall,
    });

    this.destroyRef.onDestroy(() => {
      // A visible aside means the instance is only swapped (floating-mode switch), not closed.
      if (!this.asideService.isVisible()) {
        this.turnControl.cancelRunningExecutions();
        this.clearFastPathNavigation();
      }
      void this.turnControl.stop('panel-closed');
    });

    const currentLangForSpeech = this.resolveCurrentLang();
    const speechLocale = this.languageMappingService.getSpeechLocale(currentLangForSpeech);
    this.orchestrator.initialize(
      {
        getInputText: () => this.inputText(),
        setInputText: (text: string) => { this.inputText.set(text); },
        sendMessage: () => this.sendMessage(),
        getAbortController: () => this.currentStreamController,
        detectChanges: () => this.transcript.detectChanges(),
        isTextProcessing: this.isProcessing,
        stop: (reason) => {
          // session-end also fires automatically when the floating shell disappears; that must not cancel a running execution.
          if (reason !== 'session-end') {
            this.turnControl.cancelRunningExecutions();
          }
          void this.turnControl.stop(reason);
        },
      },
      speechLocale,
    );

    this.orchestrator.errors$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((hint) => this.onVoiceErrorHint(hint));

    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        this.updateSpeechLanguage(event.lang);
        this.updateWelcomeMessage(event.lang);
        const speechLang = this.getSpeechLanguageCode(event.lang);
        this.speechService.updateLanguage(speechLang);
        this.orchestrator.setLocale(this.languageMappingService.getSpeechLocale(event.lang));
      });

    const currentLang = this.resolveCurrentLang();
    this.updateSpeechLanguage(currentLang);
    if (!this.asideService.openedWithContext() && this.messages.length === 0) {
      this.addWelcomeMessage(currentLang);
    }

    effect(() => {
      if (!this.assistantProviderService.providersInitialized()) return;
      const lang = this.pendingWelcomeLang();
      if (lang === null) return;
      this.addWelcomeMessage(lang);
    });

    effect(() => {
      if (this.asideService.isVisible()) {
        this.assistantProviderService.loadProviders();
        this.assistantService.warmupCache();

        if (!this.asideService.openedWithContext() && this.messages.length === 0) {
          const lang = this.translateService.currentLang || this.translateService.defaultLang;
          this.addWelcomeMessage(lang);
        }
      }
    });

    // Separate effect: must depend ONLY on isVisible. The block above also reads
    // this.messages.length, which changes on every streamed token — folding the plan
    // refresh in there would re-fire listMyPlans on ~60 signal writes/sec while
    // streaming and clobber the SignalR-maintained activePlan mid-conversation.
    effect(() => {
      if (this.asideService.isVisible()) {
        this.planService.refreshActivePlan()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
      }
    });

    this.tour.connect();
  }

  get messages(): readonly ChatMessage[] {
    return this.orchestrator.messages();
  }

  set messages(next: readonly ChatMessage[]) {
    this.orchestrator.replaceMessages(next);
  }

  /**
   * Turns a navigation acknowledgement that arrived as a bare i18n key into the sentence the user
   * should read. The backend streams NavigationResponseKeys unresolved by design ("The frontend
   * resolves them via its translation store"), but nothing ever did - the fast path showed
   * "nav.ack.fastPath" verbatim. Anything that is not exactly one known nav key is left untouched.
   * @param text - One raw content chunk as it came off the SSE stream
   */
  private resolveNavigationContentKey(text: string): string {
    const key = text.trim();
    if (!NAVIGATION_CONTENT_KEY_PATTERN.test(key)) return text;

    const translated = this.translateService.instant(key);
    return translated === key ? text : translated;
  }

  private stripMetadataMarkers(text: string): string {
    return stripMetadataMarkers(text);
  }

  isMuteSuggestion(message: ChatMessage): boolean {
    return this.messageActions.isMuteSuggestion(message);
  }

  toggleDismissMenu(messageId: string): void {
    this.messageActions.toggleDismissMenu(messageId);
  }

  /**
   * Hide the message and say why. The reason is what turns a dismissal into feedback Klacksy can act
   * on, so the menu offers "no reason" as a fourth choice rather than letting the button dismiss
   * silently: a user who does not want to explain still closes the row in one further click, and the
   * backend can tell that answer apart from a client that never asked.
   * @param message - The proactive message being dismissed
   * @param rejectReason - The reason the user picked
   */
  dismissProactiveMessage(message: ChatMessage, rejectReason: ProactiveRejectReason): Promise<void> {
    return this.messageActions.dismissProactiveMessage(message, rejectReason);
  }

  isHiddenProactiveMessage(message: ChatMessage): boolean {
    return this.proactiveInboxService.hiddenMessageIds().has(message.id);
  }

  isInboxMessage(message: ChatMessage): boolean {
    return this.proactiveInboxService.inboxMessageIds().has(message.id);
  }

  onProactiveActionClick(message: ChatMessage): void {
    this.messageActions.onProactiveActionClick(message);
  }

  /**
   * Mute the suggested trigger kind. Muting IS an acknowledgement on the backend (F1), which stamps
   * every still open message of that kind as acknowledged. Nothing reloads the inbox afterwards, so
   * the same truth is applied in place here - otherwise the settled messages would keep offering an
   * "Erledigt" button until the next reload.
   * @param message - The mute-suggestion message whose target kind is muted
   */
  submitMuteSuggestion(message: ChatMessage): Promise<void> {
    return this.messageActions.submitMuteSuggestion(message);
  }

  /**
   * "Mach du": grants Klacksy a one-off Prepare-level permission for this one finding, ahead of
   * whatever the trigger kind's own governance currently allows (Etappe 4e). Only ever advances
   * Prepare in this stage - Execute has no effect before Etappe 5's autonomy gate exists, so the
   * button does not offer it.
   * @param message - The proactive message reporting the finding to delegate
   */
  submitDelegate(message: ChatMessage): Promise<void> {
    return this.messageActions.submitDelegate(message);
  }

  get voiceModeEnabled(): boolean {
    return this.orchestrator.voiceModeEnabled();
  }

  get isListening(): boolean {
    return this.orchestrator.state() === ConversationState.Listening;
  }

  get isTranscribing(): boolean {
    return this.orchestrator.state() === ConversationState.Enhancing;
  }

  private scrollToBottom(): void {
    const messagesContainer = this.messagesContainer();
    if (messagesContainer?.nativeElement) {
      // 'instant' overrides the container's CSS smooth scrolling: a smooth scroll lags behind streamed text and carries the stop button out of view.
      messagesContainer.nativeElement.scrollTo({
        top: messagesContainer.nativeElement.scrollHeight,
        behavior: 'instant',
      });
    }
  }

  private clearFastPathNavigation(): void {
    if (this.fastPathNavigationTimer !== null) {
      clearTimeout(this.fastPathNavigationTimer);
      this.fastPathNavigationTimer = null;
    }
  }

  private hardAbortStream(): void {
    if (this.currentStreamController) {
      this.currentStreamController.abort();
      this.currentStreamController = null;
    }
    const streamingMessage = this.orchestrator.messages().find((m) => m.isStreaming);
    if (streamingMessage) {
      this.drainStreamBuffer(streamingMessage.id);
      const finalized = this.orchestrator.messages().find((m) => m.id === streamingMessage.id);
      this.orchestrator.updateMessage(streamingMessage.id, {
        isStreaming: false,
        formattedContent: finalized?.formattedContent ?? this.formatMessage(finalized?.content ?? ''),
      });
    }
    this.chatStageStatus.clear();
    this.streamBuffer = '';
    this.streamPreviousClean = '';
    this.currentRawStream = '';
    this.scrollMarkersDispatched = 0;
    this.klacksyNavigation.clearExplainScrollQueue();
  }

  private flushStreamBuffer(assistantMessageId: string): void {
    this.streamRafHandle = null;
    if (!this.streamBuffer) return;

    const delta = this.streamBuffer;
    this.streamBuffer = '';
    this.currentRawStream += delta;
    this.dispatchScrollMarkers(this.currentRawStream);
    const nextContent = this.stripMetadataMarkers(this.currentRawStream);
    const previousClean = this.streamPreviousClean;

    this.orchestrator.updateMessage(assistantMessageId, {
      content: nextContent,
      formattedContent: this.formatMessage(nextContent),
      isStreaming: true,
    });
    this.transcript.requestScrollToBottom();

    const ttsDelta =
      nextContent.length > previousClean.length && nextContent.startsWith(previousClean)
        ? nextContent.substring(previousClean.length)
        : '';
    this.streamPreviousClean = nextContent;

    const ttsClean = this.stripForTts(ttsDelta);
    if (ttsClean && !this.isCurrentTurnStopped()) {
      this.orchestrator.onStreamContent(ttsClean);
    }
  }

  // Fires the in-page scroll for every COMPLETE [SCROLL:target] marker that streamed in since
  // the last flush. Counting dispatched matches (instead of remembering target ids) keeps a
  // repeated target late in the answer working, e.g. when the model returns to a section.
  private dispatchScrollMarkers(rawStream: string): void {
    const matches = [...rawStream.matchAll(AssistantChatComponent.SCROLL_MARKER_REGEX)];
    for (let i = this.scrollMarkersDispatched; i < matches.length; i++) {
      this.klacksyNavigation.queueExplainScroll(matches[i][1]);
    }
    this.scrollMarkersDispatched = matches.length;
  }

  private drainStreamBuffer(assistantMessageId: string): void {
    if (this.streamRafHandle !== null) {
      cancelAnimationFrame(this.streamRafHandle);
      this.streamRafHandle = null;
    }
    if (this.streamBuffer) {
      this.flushStreamBuffer(assistantMessageId);
    }
  }

  async sendMessage(): Promise<void> {
    if (!this.inputText().trim()) {
      return;
    }

    this.turnControl.cancelRunningExecutions();
    if (this.turnControl.isTurnRunning() || this.turnControl.isStopping()) {
      await this.turnControl.stop('superseded');
    } else {
      this.ttsService.interrupt();
      this.orchestrator.stopAutoSpeak();
    }

    const userContent = this.inputText().trim();
    const userMessage: ChatMessage = {
      id: createChatMessageId(),
      sender: 'user',
      content: userContent,
      formattedContent: this.formatMessage(userContent),
      timestamp: new Date(),
    };

    this.orchestrator.addMessage(userMessage);
    if (!this.tour.isStationPending()) {
      this.toastShowService.dismissInteractiveReplies();
    }
    const messageText = this.inputText();
    this.inputText.set('');
    this.transcript.requestScrollToBottom();

    const assistantMessageId = createChatMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      sender: 'assistant',
      content: '',
      formattedContent: '',
      timestamp: new Date(),
      isStreaming: true,
      respondedToUserMessage: messageText.trim(),
    };
    this.orchestrator.addMessage(assistantMessage);
    const turnSeq = this.turnControl.beginTurn(assistantMessageId);
    const isStopped = this.turnControl.captureCancellation(turnSeq);
    this.isCurrentTurnStopped = isStopped;
    this.chatStageStatus.startMessage(assistantMessageId);
    this.sawFunctionCall = false;
    this.currentRawStream = '';
    this.streamBuffer = '';
    this.streamPreviousClean = '';
    this.scrollMarkersDispatched = 0;
    if (this.streamRafHandle !== null) {
      cancelAnimationFrame(this.streamRafHandle);
      this.streamRafHandle = null;
    }
    this.transcript.detectChanges();

    const voiceModeActive =
      this.orchestrator.voiceModeEnabled() || this.outputModes.isAutoSpeakMode();
    this.currentStreamController = this.assistantService.sendMessageStream(
      messageText,
      this.conversationId,
      {
        onStreamStart: (convId: string, turnId: string | null) => {
          if (!this.conversationId || this.conversationId !== convId) {
            this.conversationId = convId;
          }
          if (turnId) {
            this.turnControl.setTurnId(turnId);
            this.ngZone.run(() => this.orchestrator.updateMessage(assistantMessageId, { respondedToTurnId: turnId }));
          }
        },
        onStatus: (data: StreamStatus) => {
          this.ngZone.run(() => {
            this.chatStageStatus.applyStatus(data.stage);
            this.transcript.detectChanges();
          });
        },
        onFunctionCall: (data: { functionName: string; parameters: Record<string, unknown> }) => {
          this.ngZone.run(() => {
            this.sawFunctionCall = true;
            if (!isStopped()) {
              this.chatFunctionExecution.navigateForStreamedExplainCall(data.functionName, turnSeq);
            }
            this.orchestrator.onStreamFunctionCall();
            this.chatStageStatus.addToolStep(data.functionName);
            this.transcript.requestScrollToBottom();
            this.transcript.detectChanges();
          });
        },
        onFunctionResult: (data: { functionName: string }) => {
          this.ngZone.run(() => {
            this.chatStageStatus.markToolStepDone(data.functionName);
            this.transcript.detectChanges();
          });
        },
        onContent: (rawText: string) => {
          const text = this.resolveNavigationContentKey(rawText);
          if (this.toolSteps().length > 0) {
            this.orchestrator.onStreamPlanningEnded();
          }
          this.chatStageStatus.onContentStarted();
          this.streamBuffer += text;
          if (this.streamRafHandle !== null) return;
          this.streamRafHandle = requestAnimationFrame(() => {
            this.ngZone.run(() => this.flushStreamBuffer(assistantMessageId));
          });
        },
        onMetadata: (data: StreamMetadata) => {
          this.ngZone.run(() => {
            this.drainStreamBuffer(assistantMessageId);
            const current = this.orchestrator.messages().find((m) => m.id === assistantMessageId);
            const cleanedFinal = this.stripMetadataMarkers(current?.content ?? '');
            this.orchestrator.updateMessage(assistantMessageId, {
              isStreaming: false,
              content: cleanedFinal,
              formattedContent: this.formatMessage(cleanedFinal),
              suggestions: data.suggestedReplies ? undefined : data.suggestions,
              suggestedReplies: data.suggestedReplies,
              navigateTo: data.navigateTo,
              actionPerformed: data.actionPerformed,
            });
            this.chatStageStatus.clear();
            this.transcript.requestScrollToBottom();

            const offerableNavigateTo = this.offerableNavigateTo(data);
            if (!this.tour.tryReshowPendingStationChips()) {
              this.presentTurnReplies(data, offerableNavigateTo);
            }

            if (data.functionCalls && data.functionCalls.length > 0) {
              this.chatFunctionExecution.executeFunctionCalls(
                data.functionCalls,
                assistantMessageId,
                messageText,
                turnSeq,
              );
            } else if (data.navigateTo && data.actionPerformed && data.navigateTo.startsWith(WORKPLACE_ROUTE_PREFIX)) {
              const navigateTo = data.navigateTo;
              const target = data.target || undefined;
              this.clearFastPathNavigation();
              this.fastPathNavigationTimer = setTimeout(() => {
                this.fastPathNavigationTimer = null;
                if (isStopped()) return;
                void this.klacksyNavigation
                  .navigateAndScroll(navigateTo, target)
                  .then((outcome) =>
                    this.navigationVerdict.apply(assistantMessageId, outcome, navigateTo, target, messageText),
                  );
              }, AssistantChatComponent.FAST_PATH_NAVIGATE_DELAY_MS);
            }

            if (data.missedTargetId) {
              this.navigationVerdict.applySuspectedMiss(assistantMessageId);
            }

            this.transcript.detectChanges();
          });
        },
        onTurnStopped: (turnId: string | null, executedSkillLabels: string[], executedCount: number | null) => {
          this.ngZone.run(() => {
            if (this.turnControl.notifyTurnStopped(turnId, executedSkillLabels, executedCount)) {
              this.chatStageStatus.clear();
              this.transcript.detectChanges();
            }
          });
        },
        onDone: () => {
          this.ngZone.run(() => {
            this.drainStreamBuffer(assistantMessageId);
            const doneMessage = this.orchestrator.messages().find((m) => m.id === assistantMessageId);
            const doneContent = doneMessage?.content ?? '';
            this.orchestrator.updateMessage(assistantMessageId, {
              isStreaming: false,
              formattedContent: doneMessage?.formattedContent ?? this.formatMessage(doneContent),
            });
            this.transcript.requestScrollToBottom();
            this.turnControl.endTurn();
            this.chatStageStatus.clear();
            this.currentStreamController = null;
            this.transcript.detectChanges();
            this.orchestrator.onStreamDone();
            if (!isStopped()) {
              this.autoSpeak.maybeAutoSpeak(doneMessage);
            }
            this.transcript.focusInputSoon();
          });
        },
        onError: (message: string) => {
          this.ngZone.run(() => {
            this.drainStreamBuffer(assistantMessageId);
            const current = this.orchestrator.messages().find((m) => m.id === assistantMessageId);
            const existing = current?.content ?? '';
            const merged = existing ? `${existing}\n\n${message}` : message;
            this.orchestrator.updateMessage(assistantMessageId, {
              isStreaming: false,
              content: merged,
              formattedContent: this.formatMessage(merged),
            });
            this.transcript.requestScrollToBottom();
            this.turnControl.endTurn();
            this.chatStageStatus.clear();
            this.currentStreamController = null;
            this.transcript.detectChanges();
            this.orchestrator.onStreamError();
          });
        },
      },
      voiceModeActive,
    );
  }

  onVoiceButtonClick(): void {
    const currentState = this.orchestrator.state();
    if (currentState === ConversationState.Speaking || currentState === ConversationState.Processing) {
      this.orchestrator.interrupt('voice-bubble');
    } else {
      this.orchestrator.toggleVoiceMode();
    }
  }

  getVoiceButtonIcon(): IconDefinition {
    const currentState = this.orchestrator.state();
    if (currentState === ConversationState.Speaking) return this.faStop;
    if (currentState === ConversationState.Listening) return this.faMicrophone;
    if (currentState === ConversationState.Enhancing || currentState === ConversationState.Processing) return this.faSpinner;
    if (this.orchestrator.voiceModeEnabled()) return this.faMicrophone;
    return this.faMicrophoneSlash;
  }

  speakMessage(message: ChatMessage): void {
    this.messageActions.speakMessage(message);
  }

  private presentTurnReplies(data: StreamMetadata, offerableNavigateTo: string | null): void {
    if (data.suggestedReplies) {
      this.replyToasts.showRepliesAsToast(data.suggestedReplies);
    } else if (offerableNavigateTo || (data.suggestions && data.suggestions.length > 0)) {
      this.replyToasts.showActionsAsToast(data.suggestions, offerableNavigateTo);
    } else {
      this.toastShowService.dismissInteractiveReplies();
    }
  }

  private offerableNavigateTo(data: StreamMetadata): string | null {
    const navigateTo = data.navigateTo;
    if (!navigateTo) {
      return null;
    }

    const explainCallNavigates = (data.functionCalls ?? []).some((call) => {
      const name = (call['FunctionName'] ?? call['functionName']) as string | undefined;
      return !!name && name.startsWith(EXPLAIN_PAGE_SKILL_PREFIX);
    });

    if (explainCallNavigates || this.isCurrentRoute(navigateTo)) {
      return null;
    }

    return navigateTo;
  }

  private isCurrentRoute(route: string): boolean {
    const current = this.router.url.split('?')[0].split('#')[0];
    return current === route || current.startsWith(`${route}/`);
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
    this.messageActions.onNotHelpfulClick(message);
  }

  /**
   * Sends the free text the user typed with the thumbs-down. The backend overwrites the comment of
   * the same turn, so a second send simply refines the first one.
   * @param message - The assistant message the user gave a thumbs-down
   * @param comment - Free text; an empty box just closes the menu without a pointless request
   */
  submitNotHelpfulComment(message: ChatMessage, comment: string): void {
    this.messageActions.submitNotHelpfulComment(message, comment);
  }

  /**
   * Records that this answer helped. The response's found flag is deliberately ignored: whether trajectory
   * capture still had the turn to attach the mark to is nothing the user can act on. A failed request is
   * different and is reported, because otherwise the click would do nothing visible at all.
   * @param message - The assistant message the user gave a thumbs-up
   */
  submitHelpfulFeedback(message: ChatMessage): void {
    this.messageActions.submitHelpfulFeedback(message);
  }

  submitCorrection(message: ChatMessage, correctionType: CorrectionType, expectedSkill?: string): void {
    this.messageActions.submitCorrection(message, correctionType, expectedSkill);
  }

  submitProactiveReaction(message: ChatMessage, reaction: ProactiveReaction): Promise<void> {
    return this.messageActions.submitProactiveReaction(message, reaction);
  }

  /**
   * "Erledigt": acknowledges the message server-side, which stops the reminder backoff
   * for this row. Locked like the reaction buttons — one flight at a time, and a failed
   * request only shows a toast so the button stays live for a retry.
   * @param message - The proactive message the user marked as done
   */
  submitAcknowledge(message: ChatMessage): Promise<void> {
    return this.messageActions.submitAcknowledge(message);
  }

  toggleModelDropdown(): void {
    this.showModelDropdown.update((v) => !v);
  }

  selectModel(modelId: string): void {
    this.modelSelection.selectModel(modelId);
    this.showModelDropdown.set(false);
  }

  getCurrentModelInfo(): IAssistantModel | undefined {
    return this.modelSelection.getCurrentModelInfo();
  }

  formatCost(cost: number): string {
    return this.modelSelection.formatCost(cost);
  }

  onInputKeyPress(event: KeyboardEvent): void {
    if (isPrintableKey(event)) {
      if (this.orchestrator.voiceModeEnabled()) {
        this.orchestrator.endSession();
      }
      this.ttsService.interrupt();
      this.orchestrator.stopAutoSpeak();
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Greeting and action toast stay silent until the provider list is known: without a configured
   * API key Klacksy cannot answer anything, so an inviting greeting would be misleading. The
   * welcome request itself still runs — it is the only source of the onboarding state, which the
   * fresh-install case (no key yet) needs most.
   */
  private addWelcomeMessage(langCode: string): void {
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
      const placeholder = this.buildFallbackWelcome();
      this.orchestrator.addMessage({
        id: messageId,
        sender: 'assistant',
        content: placeholder.content,
        formattedContent: this.formatMessage(placeholder.content),
        timestamp: new Date(),
        suggestions: placeholder.suggestions,
      });
      this.transcript.requestScrollToBottom();
      this.replyToasts.showActionsAsToast(placeholder.suggestions);
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
        error: () => {
          /* keep the i18n fallback already shown */
        },
      });
  }

  private buildFallbackWelcome(): { content: string; suggestions: string[] } {
    return {
      content: this.translateService.instant('assistant-chat.welcome.content'),
      suggestions: [
        this.translateService.instant('assistant-chat.welcome.suggestion-1'),
        this.translateService.instant('assistant-chat.welcome.suggestion-2'),
        this.translateService.instant('assistant-chat.welcome.suggestion-3'),
        this.translateService.instant('assistant-chat.welcome.suggestion-4'),
      ],
    };
  }

  private applyWelcomeResponse(messageId: string, response: IWelcomeResponse, langCode: string): void {
    const content = this.stripMetadataMarkers(this.resolveWelcomeContent(response, langCode));
    const routes = response.suggestionRoutes ?? {};
    const suggestions = response.suggestionKeys
      .map((key) => this.translateService.instant(key))
      .filter((label) => typeof label === 'string' && label.length > 0);

    const greetingOptions: ISuggestedReply[] = response.suggestionKeys
      .map((key) => {
        const label = this.translateService.instant(key) as string;
        if (!label || !label.length) return null;
        return { label, value: routes[key] ?? label };
      })
      .filter((o): o is ISuggestedReply => o !== null);

    this.orchestrator.updateMessage(messageId, {
      content,
      formattedContent: this.formatMessage(content),
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

  startOnboardingTour(): void {
    this.tour.startOnboardingTour();
  }

  resumeTourOneStepBack(): void {
    this.tour.resumeTourOneStepBack();
  }

  dismissOnboarding(): void {
    this.tour.dismissOnboarding();
  }

  private resolveWelcomeContent(response: IWelcomeResponse, langCode: string): string {
    if (response.greetingText && response.greetingText.trim().length > 0) {
      return response.greetingText;
    }

    const weekday = response.weekdayKey
      ? this.translateService.instant(response.weekdayKey)
      : '';
    const weather = response.weatherKey
      ? this.translateService.instant(response.weatherKey)
      : '';
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
    const usesSpaceSeparator = langCode === 'fr' || langCode === 'it';
    const separator = usesSpaceSeparator ? ' ' : ', ';
    return `${separator}${displayName}`;
  }

  private updateWelcomeMessage(langCode: string): void {
    const previousWelcomeId = this.welcomeMessageId;
    if (previousWelcomeId) {
      const current = this.orchestrator.messages();
      if (current.some((message) => message.id === previousWelcomeId)) {
        this.orchestrator.replaceMessages(current.filter((message) => message.id !== previousWelcomeId));
      }
    }
    this.addWelcomeMessage(langCode);
  }

  /**
   * Delegates to the pure markdown-ish renderer in assistant-text.helper.ts, shared with the
   * chat-message component so both render identical HTML for the same content.
   * @param content - Raw message text, possibly still carrying streaming metadata markers
   */
  formatMessage(content: string): string {
    return formatMessage(content);
  }

  private stripForTts(text: string): string {
    return stripForTts(text);
  }

  private resolveCurrentLang(): string {
    return this.languageMappingService.resolveUserLanguage();
  }

  /**
   * Surfaces orchestrator voice errors in the classic chat panel, where no voice-shell
   * icon exists to blink. Floating modes keep the shell's own error visuals instead.
   * @param hint - Error hint emitted by the conversation orchestrator
   */
  private onVoiceErrorHint(hint: IVoiceShellErrorHint): void {
    if (this.outputModes.isFloatingMode()) {
      return;
    }
    const message = this.translateService.instant(hint.i18nKey);
    if (hint.kind === 'stt-empty') {
      this.toastShowService.showInfo(message);
    } else {
      this.toastShowService.showError(message);
    }
  }

  private updateSpeechLanguage(langCode: string): void {
    const speechLang = this.getSpeechLanguageCode(langCode);
    this.speechService.setLanguage(speechLang);
    this.updateLLMLanguage(langCode);
  }

  private updateLLMLanguage(langCode: string): void {
    this.assistantService.setLanguage(langCode);
  }

  private getSpeechLanguageCode(langCode: string): string {
    return this.languageMappingService.getSpeechLocale(langCode);
  }

  clearChat(): void {
    this.tour.resetPendingStation();
    this.chatStageStatus.clear();
    this.proactiveInboxService.resetInboxBlock();
    this.orchestrator.clearMessages();
    this.toastShowService.dismissInteractiveReplies();

    this.assistantService.clearConversation(this.conversationId);

    this.conversationId = createConversationId();

    const currentLang =
      this.translateService.currentLang || this.translateService.defaultLang;
    this.addWelcomeMessage(currentLang);

    this.transcript.requestScrollToBottom();
  }

  isUsingWhisper(): boolean {
    return this.speechService.getDiagnostics().useWhisperFallback;
  }

}
