// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  effect,
  ChangeDetectorRef,
  NgZone,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import {
  faMicrophone,
  faMicrophoneSlash,
  faPaperPlane,
  faUser,
  faTimes,
  faChevronDown,
  faVolumeHigh,
  faStop,
  faSpinner,
  faThumbsDown,
  faCheck,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { Subject, takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { KlacksyNavigationService } from 'src/app/core/services/klacksy-navigation.service';
import { IconUserComponent } from '../../icons/icon-user.component';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';
import { IconMMLComponent } from '../../icons/icon-mml.component';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { AsideService } from '../aside.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { ISuggestedRepliesConfig, ISuggestedReply } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ChatMessage } from './chat-message.interface';
import { ConversationOrchestratorService, ConversationState } from './services/conversation-orchestrator.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { ChatFunctionExecutionService } from './services/chat-function-execution.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { StreamMetadata } from 'src/app/infrastructure/api/assistant/data-assistant-stream.service';
import { ISubmitCorrectionRequest } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { WelcomeGreetingService } from 'src/app/application/services/welcome-greeting.service';
import { IWelcomeResponse } from 'src/app/domain/models/assistant/welcome.interface';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import {
  IOnboardingStation,
  ONBOARDING_OFFER_CHOICE,
  ONBOARDING_SETTINGS_ROUTE,
  ONBOARDING_STATIONS,
  ONBOARDING_TOUR_CHOICE,
} from 'src/app/domain/constants/onboarding-stations';

type CorrectionType = 'wrong_skill' | 'wrong_param' | 'none_needed';

@Component({
  selector: 'app-assistant-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TranslateModule,
    IconMMLComponent,
    IconUserComponent,
  ],
  templateUrl: './assistant-chat.component.html',
  styleUrls: ['./assistant-chat.component.scss'],
  providers: [
    AssistantFunctionExecutionService,
    ChatFunctionExecutionService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('chatInput') private chatInput!: ElementRef<HTMLTextAreaElement>;

  private assistantService = inject(DataManagementAssistantService);
  private assistantProviderService = inject(DataManagementAssistantProviderService);
  private chatFunctionExecution = inject(ChatFunctionExecutionService);
  readonly orchestrator = inject(ConversationOrchestratorService);
  readonly ConversationState = ConversationState;
  private asideService = inject(AsideService);
  speechService = inject(SpeechRecognitionService);
  ttsService = inject(TextToSpeechService);
  private translateService = inject(TranslateService);
  private languageMappingService = inject(LanguageMappingService);
  private klacksyNavigation = inject(KlacksyNavigationService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private assistantSignalR = inject(AssistantSignalRService);
  private toastShowService = inject(ToastShowService);
  private welcomeGreetingService = inject(WelcomeGreetingService);
  readonly onboarding = inject(OnboardingService);
  private tourIndex = 0;
  private isTourStationPending = false;
  private eventBus = inject(EVENT_BUS_TOKEN);
  private destroy$ = new Subject<void>();

  private shouldScrollToBottom = true;

  constructor() {
    effect(() => {
      if (this.asideService.isVisible()) {
        this.assistantProviderService.loadProviders();
        this.assistantService.warmupCache();

        if (!this.asideService.openedWithContext() && this.messages.length === 0) {
          const currentLang = this.translateService.currentLang || this.translateService.defaultLang;
          this.addWelcomeMessage(currentLang);
        }
      }
    });

    effect(() => {
      if (this.onboarding.tourStartRequested() > 0) {
        this.restartGuidedTour();
      }
    });
  }

  private restartGuidedTour(): void {
    this.onboarding.accept();
    this.tourIndex = 0;
    this.presentStationAtCursor();
  }

  get messages(): readonly ChatMessage[] {
    return this.orchestrator.messages();
  }

  set messages(next: readonly ChatMessage[]) {
    this.orchestrator.replaceMessages(next);
  }

  faMicrophone = faMicrophone;
  faMicrophoneSlash = faMicrophoneSlash;
  faPaperPlane = faPaperPlane;
  faUser = faUser;
  faTimes = faTimes;
  faChevronDown = faChevronDown;
  faVolumeHigh = faVolumeHigh;
  faStop = faStop;
  faSpinner = faSpinner;
  faThumbsDown = faThumbsDown;
  faCheck = faCheck;

  correctionMenuMessageId = signal<string | null>(null);

  inputText = '';
  isProcessing = false;
  currentToolStatusKey = '';
  conversationId = '';
  private currentStreamController: AbortController | null = null;
  private currentRawStream = '';
  private streamBuffer = '';
  private streamRafHandle: number | null = null;
  private streamPreviousClean = '';

  private static readonly METADATA_MARKER_REGEX = /\[(SUGGESTIONS|REPLIES)(?::[^\]]*?)?\]/g;
  private static readonly TRAILING_MARKER_REGEX = /\[(SUGGESTIONS|REPLIES)(?::[\s\S]*)?$/;
  private static readonly FAST_PATH_NAVIGATE_DELAY_MS = 0;

  private static readonly TOOL_STATUS_PREFIX = 'assistant-chat.tool-status.';

  private toolStatusKey(functionName: string): string {
    const name = (functionName || '').toLowerCase();
    let category = 'working';
    if (name.startsWith('search') || name.startsWith('list') || name.startsWith('find') || name.startsWith('get') || name.includes('web_search')) {
      category = 'searching';
    } else if (name.startsWith('create') || name.startsWith('add')) {
      category = 'creating';
    } else if (name.startsWith('update') || name.startsWith('assign') || name.startsWith('remove') || name.startsWith('set') || name.startsWith('delete')) {
      category = 'updating';
    } else if (name.startsWith('navigate') || name.startsWith('open') || name.includes('navigate')) {
      category = 'navigating';
    }
    return AssistantChatComponent.TOOL_STATUS_PREFIX + category;
  }

  private stripMetadataMarkers(text: string): string {
    if (!text) return text;
    return text
      .replace(AssistantChatComponent.METADATA_MARKER_REGEX, '')
      .replace(AssistantChatComponent.TRAILING_MARKER_REGEX, '')
      .trimEnd();
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

  availableModels: IAssistantModel[] = [];
  currentModel = '';
  showModelDropdown = false;
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.model-dropdown')) {
      this.showModelDropdown = false;
    }
  }

  ngOnInit(): void {
    this.conversationId = this.generateConversationId();

    const currentLangForSpeech = this.translateService.currentLang || this.translateService.defaultLang;
    const speechLocale = this.languageMappingService.getSpeechLocale(currentLangForSpeech);
    this.orchestrator.initialize(
      {
        getInputText: () => this.inputText,
        setInputText: (text: string) => { this.inputText = text; },
        sendMessage: () => this.sendMessage(),
        getAbortController: () => this.currentStreamController,
        detectChanges: () => this.cdr.detectChanges(),
      },
      speechLocale,
    );

    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.updateSpeechLanguage(event.lang);
        this.updateWelcomeMessage(event.lang);

        const speechLang = this.getSpeechLanguageCode(event.lang);
        this.speechService.updateLanguage(speechLang);
      });

    const currentLang =
      this.translateService.currentLang || this.translateService.defaultLang;
    this.updateSpeechLanguage(currentLang);
    if (!this.asideService.openedWithContext() && this.messages.length === 0) {
      this.addWelcomeMessage(currentLang);
    }

    this.assistantService
      .getAvailableModels()
      .pipe(takeUntil(this.destroy$))
      .subscribe((models) => {
        this.availableModels = models.filter((model) => model.isEnabled);
      });

    this.assistantService
      .getCurrentModelId()
      .pipe(takeUntil(this.destroy$))
      .subscribe((modelId) => {
        this.currentModel = modelId;
      });

    this.assistantSignalR.proactiveMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        this.ngZone.run(() => {
          const proactiveContent = this.stripMetadataMarkers(msg.content);
          this.orchestrator.addMessage({
            id: msg.messageId,
            sender: 'assistant',
            content: proactiveContent,
            formattedContent: this.formatMessage(proactiveContent),
            timestamp: new Date(msg.timestamp),
          });
          this.shouldScrollToBottom = true;
          this.cdr.detectChanges();
        });
      });

    this.assistantSignalR.onboardingPrompt$
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        this.ngZone.run(() => {
          const onboardingContent = this.stripMetadataMarkers(msg.content);
          this.orchestrator.addMessage({
            id: msg.messageId,
            sender: 'assistant',
            content: onboardingContent,
            formattedContent: this.formatMessage(onboardingContent),
            timestamp: new Date(msg.timestamp),
          });
          this.shouldScrollToBottom = true;
          this.cdr.detectChanges();
        });
      });

  }

  ngOnDestroy(): void {
    if (this.streamRafHandle !== null) {
      cancelAnimationFrame(this.streamRafHandle);
      this.streamRafHandle = null;
    }
    this.ttsService.stop();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private flushStreamBuffer(assistantMessageId: string): void {
    this.streamRafHandle = null;
    if (!this.streamBuffer) return;

    const delta = this.streamBuffer;
    this.streamBuffer = '';
    this.currentRawStream += delta;
    const nextContent = this.stripMetadataMarkers(this.currentRawStream);
    const previousClean = this.streamPreviousClean;

    this.orchestrator.updateMessage(assistantMessageId, {
      content: nextContent,
      isStreaming: true,
    });
    this.shouldScrollToBottom = true;

    const ttsDelta = nextContent.length > previousClean.length && nextContent.startsWith(previousClean)
      ? nextContent.substring(previousClean.length)
      : '';
    this.streamPreviousClean = nextContent;

    const ttsClean = this.stripForTts(ttsDelta);
    if (ttsClean) {
      this.orchestrator.onStreamContent(ttsClean);
    }
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

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    }
  }

  async sendMessage(): Promise<void> {
    if (!this.inputText.trim() || this.isProcessing) {
      return;
    }

    if (this.onboarding.isAwaitingAnswer()) {
      this.handleOnboardingAnswer(this.inputText.trim());
      return;
    }

    const userMessage: ChatMessage = {
      id: this.generateMessageId(),
      sender: 'user',
      content: this.inputText.trim(),
      timestamp: new Date(),
    };

    this.orchestrator.addMessage(userMessage);
    if (!this.isTourStationPending) {
      this.toastShowService.dismissInteractiveReplies();
    }
    const messageText = this.inputText;
    this.inputText = '';
    this.isProcessing = true;
    this.currentToolStatusKey = '';
    this.shouldScrollToBottom = true;

    const assistantMessageId = this.generateMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      sender: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      respondedToUserMessage: messageText.trim(),
    };
    this.orchestrator.addMessage(assistantMessage);
    this.currentRawStream = '';
    this.streamBuffer = '';
    this.streamPreviousClean = '';
    if (this.streamRafHandle !== null) {
      cancelAnimationFrame(this.streamRafHandle);
      this.streamRafHandle = null;
    }
    this.cdr.detectChanges();

    this.currentStreamController = this.assistantService.sendMessageStream(
      messageText,
      this.conversationId,
      {
        onStreamStart: (convId: string) => {
          if (!this.conversationId || this.conversationId !== convId) {
            this.conversationId = convId;
          }
        },
        onFunctionCall: (data: { functionName: string; parameters: Record<string, unknown> }) => {
          this.ngZone.run(() => {
            this.currentToolStatusKey = this.toolStatusKey(data.functionName);
            this.cdr.detectChanges();
          });
        },
        onContent: (text: string) => {
          if (this.currentToolStatusKey) {
            this.currentToolStatusKey = '';
          }
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

            if (this.isTourStationPending && this.tourIndex < ONBOARDING_STATIONS.length) {
              this.showStationChips(ONBOARDING_STATIONS[this.tourIndex]);
            } else if (data.suggestedReplies) {
              this.showRepliesAsToast(data.suggestedReplies);
            } else if (data.navigateTo || (data.suggestions && data.suggestions.length > 0)) {
              this.showActionsAsToast(data.suggestions, data.navigateTo);
            } else {
              this.toastShowService.dismissInteractiveReplies();
            }

            if (data.functionCalls && data.functionCalls.length > 0) {
              this.chatFunctionExecution.executeFunctionCalls(data.functionCalls);
            } else if (data.navigateTo && data.actionPerformed && data.navigateTo.startsWith('/workplace/')) {
              const navigateTo = data.navigateTo;
              const target = data.target;
              setTimeout(() => {
                this.klacksyNavigation.navigateAndScroll(navigateTo, target || undefined);
              }, AssistantChatComponent.FAST_PATH_NAVIGATE_DELAY_MS);
            }

            this.cdr.detectChanges();
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
            this.isProcessing = false;
            this.currentToolStatusKey = '';
            this.currentStreamController = null;
            this.cdr.detectChanges();
            this.orchestrator.onStreamDone();
            setTimeout(() => this.chatInput?.nativeElement?.focus(), 0);
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
            this.isProcessing = false;
            this.currentToolStatusKey = '';
            this.currentStreamController = null;
            this.cdr.detectChanges();
            this.orchestrator.onStreamError();
          });
        },
      },
    );
  }

  onVoiceButtonClick(): void {
    const currentState = this.orchestrator.state();
    if (currentState === ConversationState.Speaking || currentState === ConversationState.Processing) {
      this.orchestrator.interrupt();
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
    const currentLang = this.translateService.currentLang || this.translateService.defaultLang;
    const locale = this.languageMappingService.getSpeechLocale(currentLang);
    const cleaned = this.stripForTts(this.stripMetadataMarkers(message.content));
    this.ttsService.speak(cleaned, message.id, locale);
  }

  onSuggestionClick(suggestion: string): void {
    this.inputText = suggestion;
    this.sendMessage();
  }

  private showRepliesAsToast(config: ISuggestedRepliesConfig): void {
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(
      config,
      (values: string[]) => {
        this.ngZone.run(() => {
          if (values.length === 0) return;
          this.inputText = values.join(', ');
          this.sendMessage();
        });
      },
    );
  }

  private showActionsAsToast(suggestions?: string[], navigateTo?: string | null): void {
    const options: ISuggestedReply[] = [];
    if (navigateTo && navigateTo.startsWith('/workplace/')) {
      options.push({
        label: '📍 ' + this.translateService.instant('assistant-chat.open'),
        value: navigateTo,
      });
    }
    if (suggestions) {
      for (const s of suggestions) {
        options.push({ label: s, value: s });
      }
    }
    if (options.length === 0) {
      this.toastShowService.dismissInteractiveReplies();
      return;
    }
    const config: ISuggestedRepliesConfig = {
      selectionMode: 'single',
      prompt: this.translateService.instant('assistant-chat.action-toast.prompt'),
      options,
    };
    this.toastShowService.showInteractiveReply(config, (values: string[]) => {
      this.ngZone.run(() => {
        if (values.length === 0) return;
        const value = values[0];
        if (value.startsWith('/workplace/')) {
          this.onNavigateClick(value);
        } else {
          this.onSuggestionClick(value);
        }
      });
    });
  }

  onNavigateClick(navigateTo: string): void {
    if (navigateTo.startsWith('/workplace/')) {
      this.klacksyNavigation.navigateAndScroll(navigateTo);
    }
  }

  toggleCorrectionMenu(messageId: string): void {
    const current = this.correctionMenuMessageId();
    this.correctionMenuMessageId.set(current === messageId ? null : messageId);
  }

  submitCorrection(message: ChatMessage, correctionType: CorrectionType): void {
    if (!message.respondedToUserMessage || message.correctionSubmitted) return;

    const request: ISubmitCorrectionRequest = {
      userMessage: message.respondedToUserMessage,
      correctionType,
    };

    this.assistantService
      .submitCorrection(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.orchestrator.updateMessage(message.id, { correctionSubmitted: true });
            this.correctionMenuMessageId.set(null);
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.correctionMenuMessageId.set(null);
            this.cdr.detectChanges();
          });
        },
      });
  }

  toggleModelDropdown(): void {
    this.showModelDropdown = !this.showModelDropdown;
  }

  selectModel(modelId: string): void {
    this.assistantService.setCurrentModel(modelId);
    this.currentModel = modelId;
    this.showModelDropdown = false;
    this.assistantService.warmupCache();
  }

  getCurrentModelInfo(): IAssistantModel | undefined {
    return this.assistantService.getModelInfo(this.currentModel);
  }

  formatCost(cost: number): string {
    return `€${cost.toFixed(4)}/1K tokens`;
  }

  onInputKeyPress(event: KeyboardEvent): void {
    if (this.orchestrator.voiceModeEnabled() && this.isPrintableKey(event)) {
      this.orchestrator.endSession();
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private isPrintableKey(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.altKey || event.metaKey) return false;
    if (event.key.length === 1) return true;
    return event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Enter';
  }

  private addWelcomeMessage(langCode: string): void {
    const placeholder = this.buildFallbackWelcome();
    const messageId = this.generateMessageId();

    this.orchestrator.addMessage({
      id: messageId,
      sender: 'assistant',
      content: placeholder.content,
      formattedContent: this.formatMessage(placeholder.content),
      timestamp: new Date(),
      suggestions: placeholder.suggestions,
    });
    this.showActionsAsToast(placeholder.suggestions);

    this.welcomeGreetingService.fetchWelcome()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.applyWelcomeResponse(messageId, response, langCode),
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
    const content = this.resolveWelcomeContent(response, langCode);
    const suggestions = response.suggestionKeys
      .map((key) => this.translateService.instant(key))
      .filter((label) => typeof label === 'string' && label.length > 0);

    this.orchestrator.updateMessage(messageId, {
      content,
      formattedContent: this.formatMessage(content),
      suggestions,
    });

    if (suggestions.length > 0) {
      this.showActionsAsToast(suggestions);
    }

    this.onboarding.applyWelcome(response.onboarding);
    this.maybeOfferOnboarding();
  }

  private maybeOfferOnboarding(): void {
    if (!this.onboarding.shouldOffer() || this.onboarding.hasOfferedThisSession()) {
      return;
    }
    this.onboarding.markOfferedThisSession();
    this.showOnboardingOffer();
  }

  private showOnboardingOffer(): void {
    const config: ISuggestedRepliesConfig = {
      selectionMode: 'single',
      prompt: this.translateService.instant('assistant-chat.onboarding.offer.prompt'),
      options: [
        { label: this.translateService.instant('assistant-chat.onboarding.offer.accept'), value: ONBOARDING_OFFER_CHOICE.Accept },
        { label: this.translateService.instant('assistant-chat.onboarding.offer.snooze'), value: ONBOARDING_OFFER_CHOICE.Snooze },
        { label: this.translateService.instant('assistant-chat.onboarding.offer.dismiss'), value: ONBOARDING_OFFER_CHOICE.Dismiss },
      ],
    };
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(config, (values: string[]) => {
      this.ngZone.run(() => {
        if (values.length === 0) return;
        this.handleOnboardingChoice(values[0]);
      });
    });
  }

  private handleOnboardingChoice(choice: string): void {
    if (choice === ONBOARDING_OFFER_CHOICE.Accept) {
      this.startOnboardingTour();
    } else if (choice === ONBOARDING_OFFER_CHOICE.Snooze) {
      this.onboarding.snooze();
    } else if (choice === ONBOARDING_OFFER_CHOICE.Dismiss) {
      this.onboarding.dismiss();
    }
  }

  startOnboardingTour(): void {
    this.onboarding.accept();
    this.tourIndex = this.onboarding.firstPendingIndex();
    this.presentStationAtCursor();
  }

  dismissOnboarding(): void {
    this.onboarding.dismiss();
  }

  private presentStationAtCursor(): void {
    this.isTourStationPending = false;
    if (this.tourIndex >= ONBOARDING_STATIONS.length) {
      this.completeTour();
      return;
    }
    const station = ONBOARDING_STATIONS[this.tourIndex];
    this.klacksyNavigation.navigateAndScroll(station.route ?? ONBOARDING_SETTINGS_ROUTE, station.target || undefined);
    this.klacksyNavigation.highlightNavIcon(station.navIconId);
    if (station.type === 'ask') {
      this.postKlacksyMessage(this.translateService.instant(station.explainKey));
      this.onboarding.beginAsk(station.id);
      this.presentAskField();
    } else {
      this.postKlacksyMessage(this.translateService.instant(station.explainKey));
      this.showStationChips(station);
    }
  }

  private presentAskField(): void {
    const field = this.onboarding.currentAskField();
    if (!field) {
      return;
    }
    this.postKlacksyMessage(this.translateService.instant(field.promptKey));
    this.showAskChips();
  }

  private showStationChips(station: IOnboardingStation): void {
    const config: ISuggestedRepliesConfig = {
      selectionMode: 'single',
      options: [
        { label: this.translateService.instant('assistant-chat.onboarding.tour.done'), value: ONBOARDING_TOUR_CHOICE.Done },
        { label: this.translateService.instant('assistant-chat.onboarding.tour.skip'), value: ONBOARDING_TOUR_CHOICE.Skip },
        { label: this.translateService.instant('assistant-chat.onboarding.tour.end'), value: ONBOARDING_TOUR_CHOICE.End },
      ],
    };
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(config, (values: string[]) => {
      this.ngZone.run(() => {
        if (values.length === 0) return;
        this.handleStationChoice(station, values[0]);
      });
    });
    this.isTourStationPending = true;
  }

  private showAskChips(): void {
    const config: ISuggestedRepliesConfig = {
      selectionMode: 'single',
      options: [
        { label: this.translateService.instant('assistant-chat.onboarding.tour.skip'), value: ONBOARDING_TOUR_CHOICE.Skip },
        { label: this.translateService.instant('assistant-chat.onboarding.tour.end'), value: ONBOARDING_TOUR_CHOICE.End },
      ],
    };
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(config, (values: string[]) => {
      this.ngZone.run(() => {
        if (values.length === 0) return;
        this.handleAskChoice(values[0]);
      });
    });
  }

  private handleStationChoice(station: IOnboardingStation, choice: string): void {
    if (choice === ONBOARDING_TOUR_CHOICE.Done) {
      this.onboarding.markStationCompleted(station.id);
      this.advanceTour();
    } else if (choice === ONBOARDING_TOUR_CHOICE.Skip) {
      this.advanceTour();
    } else {
      this.endTour();
    }
  }

  private handleAskChoice(choice: string): void {
    this.onboarding.cancelAsk();
    if (choice === ONBOARDING_TOUR_CHOICE.Skip) {
      this.advanceTour();
    } else {
      this.endTour();
    }
  }

  private handleOnboardingAnswer(text: string): void {
    this.orchestrator.addMessage({
      id: this.generateMessageId(),
      sender: 'user',
      content: text,
      timestamp: new Date(),
    });
    this.inputText = '';
    this.toastShowService.dismissInteractiveReplies();
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();

    const stationId = this.onboarding.currentAskStationId();
    const field = this.onboarding.currentAskField();
    if (!stationId || !field) {
      this.onboarding.cancelAsk();
      return;
    }
    this.onboarding.writeField(field, text).subscribe({
      next: () => this.ngZone.run(() => this.afterAskFieldWritten(stationId)),
      error: () => this.ngZone.run(() => this.afterAskFieldWritten(stationId)),
    });
  }

  private afterAskFieldWritten(stationId: string): void {
    const next = this.onboarding.advanceAskField();
    if (next) {
      this.presentAskField();
      return;
    }
    this.onboarding.cancelAsk();
    this.onboarding.markStationCompleted(stationId);
    this.postKlacksyMessage(this.translateService.instant('assistant-chat.onboarding.ask.saved'));
    this.advanceTour();
  }

  private advanceTour(): void {
    this.tourIndex += 1;
    this.presentStationAtCursor();
  }

  private completeTour(): void {
    this.isTourStationPending = false;
    this.toastShowService.dismissInteractiveReplies();
    this.onboarding.completeTour();
    this.postKlacksyMessage(this.translateService.instant('assistant-chat.onboarding.tour.completed'));
  }

  private endTour(): void {
    this.isTourStationPending = false;
    this.toastShowService.dismissInteractiveReplies();
    this.onboarding.cancelAsk();
    this.onboarding.dismiss();
  }

  private postKlacksyMessage(content: string): void {
    this.orchestrator.addMessage({
      id: this.generateMessageId(),
      sender: 'assistant',
      content,
      formattedContent: this.formatMessage(content),
      timestamp: new Date(),
    });
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();
  }

  private resolveWelcomeContent(response: IWelcomeResponse, langCode: string): string {
    const weekday = response.weekdayKey
      ? this.translateService.instant(response.weekdayKey)
      : '';
    const weather = response.weatherKey
      ? this.translateService.instant(response.weatherKey)
      : '';
    const name = this.formatNameSlot(response.displayName, langCode);

    return this.translateService.instant(response.greetingKey, {
      name,
      weekday,
      weather,
    });
  }

  private formatNameSlot(displayName: string | null | undefined, langCode: string): string {
    if (!displayName) return '';
    const usesSpaceSeparator = langCode === 'fr' || langCode === 'it';
    const separator = usesSpaceSeparator ? ' ' : ', ';
    return `${separator}${displayName}`;
  }

  private updateWelcomeMessage(langCode: string): void {
    const current = this.orchestrator.messages();
    if (current.length > 0 && current[0].sender === 'assistant') {
      this.orchestrator.replaceMessages(current.slice(1));
    }
    this.addWelcomeMessage(langCode);
  }

  private generateConversationId(): string {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  formatMessage(content: string): string {
    const cleaned = this.stripMetadataMarkers(content);
    const escaped = this.escapeForHtml(cleaned);

    const blocks: string[] = [];
    let textBuffer: string[] = [];
    let inList = false;

    const flushText = (): void => {
      if (textBuffer.length > 0) {
        blocks.push(textBuffer.join('<br>'));
        textBuffer = [];
      }
    };
    const closeList = (): void => {
      if (inList) {
        blocks.push('</ul>');
        inList = false;
      }
    };

    for (const line of escaped.split('\n')) {
      const trimmed = line.trim();

      if (/^-{3,}$/.test(trimmed)) {
        flushText();
        closeList();
        blocks.push('<hr>');
        continue;
      }

      const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
      if (heading) {
        flushText();
        closeList();
        const level = Math.min(heading[1].length + 1, 6);
        blocks.push(`<h${level}>${heading[2]}</h${level}>`);
        continue;
      }

      const listItem = /^[-*]\s+(.+)$/.exec(trimmed);
      if (listItem) {
        flushText();
        if (!inList) {
          blocks.push('<ul>');
          inList = true;
        }
        blocks.push(`<li>${listItem[1]}</li>`);
        continue;
      }

      closeList();

      if (trimmed === '') {
        flushText();
        if (blocks.length > 0 && blocks[blocks.length - 1] !== '<br>') {
          blocks.push('<br>');
        }
        continue;
      }

      textBuffer.push(line);
    }

    flushText();
    closeList();

    return blocks.join('')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
      .replace(/`([^`\n]+?)`/g, '<code>$1</code>');
  }

  private static readonly EMOJI_REGEX = /\p{Extended_Pictographic}/gu;
  private static readonly TTS_MARKDOWN_REGEX = /^[#>\-*]+\s*|[*_`]+/gm;
  private static readonly TTS_BULLET_REGEX = /[•‒–—―‣◦▪▫▶◀●○■□]/g;

  private stripForTts(text: string): string {
    if (!text) return text;
    const stripped = text
      .replace(AssistantChatComponent.EMOJI_REGEX, '')
      .replace(/^-{3,}\s*$/gm, '')
      .replace(AssistantChatComponent.TTS_MARKDOWN_REGEX, '')
      .replace(AssistantChatComponent.TTS_BULLET_REGEX, '')
      .replace(/[ \t]+/g, ' ');

    return stripped
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n')
      .trim();
  }

  private escapeForHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
    this.isTourStationPending = false;
    this.orchestrator.clearMessages();
    this.toastShowService.dismissInteractiveReplies();

    this.assistantService.clearConversation(this.conversationId);

    this.conversationId = this.generateConversationId();

    const currentLang =
      this.translateService.currentLang || this.translateService.defaultLang;
    this.addWelcomeMessage(currentLang);

    this.shouldScrollToBottom = true;
  }

  isInitializing(): boolean {
    return !this.assistantService.modelsInitialized() || !this.assistantProviderService.providersInitialized();
  }

  hasNoApiKey(): boolean {
    if (this.isInitializing()) {
      return false;
    }

    const providers = this.assistantProviderService.getCurrentProviders();
    if (!providers || providers.length === 0) return true;

    const currentModelInfo = this.availableModels?.find(m => m.modelId === this.currentModel);
    if (currentModelInfo) {
      const provider = providers.find(p => p.providerId === currentModelInfo.providerId);
      return !provider?.hasApiKey;
    }

    return !providers.some(p => p.hasApiKey);
  }

  isUsingWhisper(): boolean {
    return this.speechService.getDiagnostics().useWhisperFallback;
  }
}
