// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
  ChangeDetectorRef,
  NgZone,
  signal,
  computed,
  linkedSignal,
  ChangeDetectionStrategy,
  DestroyRef,
  afterEveryRender,
  viewChild
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
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
  faThumbsUp,
  faCheck,
  faBell,
  faBellSlash,
  faArrowRight,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { Router } from '@angular/router';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { EXPLAIN_PAGE_SKILL_PREFIX } from 'src/app/domain/constants/page-explain-icons.constants';
import { IconUserComponent } from '../../icons/icon-user.component';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';
import { IconMMLComponent } from '../../icons/icon-mml.component';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { AsideService } from '../aside.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { DataManagementAgentPlanService } from 'src/app/domain/services/assistant/data-management-agent-plan.service';
import { PlanExecutionPanelComponent } from './plan-execution-panel/plan-execution-panel.component';
import { ISuggestedRepliesConfig, ISuggestedReply } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ChatMessage } from './chat-message.interface';
import { ToolStep } from './tool-step.interface';
import { ConversationOrchestratorService, ConversationState } from './services/conversation-orchestrator.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { isPrintableKey } from 'src/app/shared/helpers/keyboard.helper';
import { OutputMode } from 'src/app/domain/constants/speech-constants';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ChatFunctionExecutionService } from './services/chat-function-execution.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { IProactiveMessage } from 'src/app/domain/interfaces/proactive-message.interface';
import { IProactiveInboxItem } from 'src/app/domain/interfaces/proactive-inbox.interface';
import { DataManagementProactiveInboxService } from 'src/app/domain/services/assistant/data-management-proactive-inbox.service';
import { PROACTIVE_REACTION, ProactiveReaction } from 'src/app/domain/constants/proactive-reaction.constants';
import {
  MUTE_SUGGESTION_KIND_PARAM,
  PROACTIVE_TRIGGER_KIND,
} from 'src/app/domain/constants/proactive-trigger-kinds.constants';
import { StreamMetadata } from 'src/app/infrastructure/api/assistant/data-assistant-stream.service';
import { ISubmitCorrectionRequest } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { WelcomeGreetingService } from 'src/app/application/services/welcome-greeting.service';
import { IWelcomeResponse } from 'src/app/domain/models/assistant/welcome.interface';
import type { IVoiceShellErrorHint } from 'src/app/domain/models/assistant/voice-shell-error-hint.model';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import {
  IOnboardingAskField,
  IOnboardingStation,
  onboardingAskFields,
  ONBOARDING_OFFER_CHOICE,
  ONBOARDING_SETTINGS_ROUTE,
  ONBOARDING_STATION_DEFAULT_LANGUAGE,
  ONBOARDING_STATION_LLM_PROVIDER,
  ONBOARDING_STATION_TITLE,
  ONBOARDING_STATIONS,
  ONBOARDING_TOUR_CHOICE,
} from 'src/app/domain/constants/onboarding-stations';

const ONBOARDING_LLM_OFFLINE_KEY = 'assistant-chat.onboarding.llm.offline';
const ONBOARDING_LLM_ONLINE_KEY = 'assistant-chat.onboarding.llm.online';
const ONBOARDING_LLM_STILL_OFFLINE_KEY = 'assistant-chat.onboarding.llm.still-offline';
const ONBOARDING_LLM_FREE_PROVIDERS_KEY = 'assistant-chat.onboarding.llm.free-providers';
const ONBOARDING_DOUBLE_CLICK_EDIT_HINT_KEY = 'assistant-chat.onboarding.hint.double-click-edit';
const PROACTIVE_REACTION_ERROR_KEY = 'assistant-chat.error.generic';
const PROACTIVE_MUTE_CONFIRMED_KEY = 'assistant-chat.proactive.mute-confirmed';
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

type CorrectionType = 'wrong_skill' | 'wrong_param' | 'none_needed';

@Component({
  selector: 'app-assistant-chat',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    FontAwesomeModule,
    TranslateModule,
    IconMMLComponent,
    IconUserComponent,
    PlanExecutionPanelComponent,
  ],
  templateUrl: './assistant-chat.component.html',
  styleUrls: ['./assistant-chat.component.scss'],
  providers: [
    AssistantFunctionExecutionService,
    ChatFunctionExecutionService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantChatComponent {
  private readonly messagesContainer = viewChild.required<ElementRef>('messagesContainer');
  private readonly chatInput = viewChild<ElementRef<HTMLTextAreaElement>>('chatInput');

  private assistantService = inject(DataManagementAssistantService);
  private assistantProviderService = inject(DataManagementAssistantProviderService);
  private chatFunctionExecution = inject(ChatFunctionExecutionService);
  readonly orchestrator = inject(ConversationOrchestratorService);
  readonly ConversationState = ConversationState;
  private asideService = inject(AsideService);
  speechService = inject(SpeechRecognitionService);
  ttsService = inject(TextToSpeechService);
  private appSettings = inject(AppSettingsManagementService);
  private translateService = inject(TranslateService);
  private languageMappingService = inject(LanguageMappingService);
  private languageConfigService = inject(LanguageConfigService);
  private klacksyNavigation = inject(KlacksyNavigationService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private assistantSignalR = inject(AssistantSignalRService);
  private proactiveInboxService = inject(DataManagementProactiveInboxService);
  readonly planService = inject(DataManagementAgentPlanService);
  private toastShowService = inject(ToastShowService);
  private welcomeGreetingService = inject(WelcomeGreetingService);
  private localStorageService = inject(LocalStorageService);
  private dataLoadFileService = inject(DataLoadFileService);
  readonly onboarding = inject(OnboardingService);
  private readonly destroyRef = inject(DestroyRef);
  private tourIndex = 0;
  private isTourStationPending = false;
  private readonly liveTourStep = signal<number | null>(null);
  private llmOfflineHintShown = false;
  private eventBus = inject(EVENT_BUS_TOKEN);

  private shouldScrollToBottom = true;
  private pendingGreetingMessageId: string | null = null;
  private pendingGreetingOptions: ISuggestedReply[] = [];
  private greetingSpoken = false;

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
  faThumbsUp = faThumbsUp;
  faCheck = faCheck;
  faBell = faBell;
  faBellSlash = faBellSlash;
  faArrowRight = faArrowRight;

  readonly proactiveReactions = PROACTIVE_REACTION;

  correctionMenuMessageId = signal<string | null>(null);
  readonly pendingReactionMessageId = signal<string | null>(null);
  readonly pendingMuteMessageId = signal<string | null>(null);
  readonly inboxHeadingMessageId = signal<string | null>(null);
  private inboxLoadRequested = false;

  inputText = signal('');
  isProcessing = signal(false);
  toolSteps = signal<readonly ToolStep[]>([]);
  showModelDropdown = signal(false);

  readonly availableModels = computed(() =>
    this.assistantService.availableModels().filter((m) => m.isEnabled),
  );
  currentModel = linkedSignal(() => this.assistantService.selectedModelId());

  readonly isInitializing = computed(
    () => !this.assistantService.modelsInitialized() || !this.assistantProviderService.providersInitialized(),
  );

  readonly hasNoApiKey = computed(() => {
    if (this.isInitializing()) return false;
    const providers = this.assistantProviderService.getCurrentProviders();
    if (!providers || providers.length === 0) return true;
    const currentModelInfo = this.availableModels().find((m) => m.modelId === this.currentModel());
    if (currentModelInfo) {
      const provider = providers.find((p) => p.providerId === currentModelInfo.providerId);
      return !provider?.hasApiKey;
    }
    return !providers.some((p) => p.hasApiKey);
  });

  readonly isTourActive = computed(() => this.onboarding.isTourActive());
  readonly displayedTourProgress = computed(() => {
    const liveStep = this.liveTourStep();
    return liveStep === null ? this.onboarding.progress() : Math.min(liveStep, this.onboarding.total);
  });
  readonly logoImage = computed(() => this.dataLoadFileService.logoImage$());
  readonly hasLogoImage = computed(() => !!this.logoImage());

  conversationId = '';
  private currentStreamController: AbortController | null = null;
  private pendingProactiveChatMessages: IProactiveMessage[] = [];
  private currentRawStream = '';
  private streamBuffer = '';
  private streamRafHandle: number | null = null;
  private streamPreviousClean = '';
  private scrollMarkersDispatched = 0;

  private static readonly METADATA_MARKER_REGEX = /\[(SUGGESTIONS|REPLIES|SCROLL)(?::[^\]]*?)?\]/g;
  private static readonly TRAILING_MARKER_REGEX = /\[(SUGGESTIONS|REPLIES|SCROLL)(?::[\s\S]*)?$/;
  private static readonly SCROLL_MARKER_REGEX = /\[SCROLL:\s*([\w-]+)\s*\]/gi;
  private static readonly TOOL_CALL_BLOCK_REGEX = /<\s*function_calls\b[\s\S]*?<\s*\/\s*function_calls\s*>/gi;
  private static readonly TOOL_CALL_TRAILING_REGEX = /<\s*function_calls\b[\s\S]*$/i;
  private static readonly INVOKE_BLOCK_REGEX = /<\s*invoke\b[\s\S]*?<\s*\/\s*invoke\s*>/gi;
  private static readonly INVOKE_TRAILING_REGEX = /<\s*invoke\b[\s\S]*$/i;
  private static readonly FAST_PATH_NAVIGATE_DELAY_MS = 0;
  private static readonly TOOL_STATUS_PREFIX = 'assistant-chat.tool-status.';

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.model-dropdown')) {
      this.showModelDropdown.set(false);
    }
  }

  constructor() {
    this.conversationId = this.generateConversationId();

    afterEveryRender(() => {
      if (this.shouldScrollToBottom) {
        this.scrollToBottom();
        this.shouldScrollToBottom = false;
      }
    });

    effect(() => {
      if (this.asideService.isVisible() && !this.greetingSpoken && this.pendingGreetingMessageId) {
        const msg = this.orchestrator.messages().find(m => m.id === this.pendingGreetingMessageId);
        if (msg) {
          this.maybeAutoSpeak(msg);
          this.greetingSpoken = true;
          if (this.pendingGreetingOptions.length > 0) {
            this.showGreetingOptionsAsToast(this.pendingGreetingOptions);
            this.pendingGreetingOptions = [];
          }
        }
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.streamRafHandle !== null) {
        cancelAnimationFrame(this.streamRafHandle);
        this.streamRafHandle = null;
      }
      this.ttsService.stop();
    });

    const currentLangForSpeech = this.resolveCurrentLang();
    const speechLocale = this.languageMappingService.getSpeechLocale(currentLangForSpeech);
    this.orchestrator.initialize(
      {
        getInputText: () => this.inputText(),
        setInputText: (text: string) => { this.inputText.set(text); },
        sendMessage: () => this.sendMessage(),
        getAbortController: () => this.currentStreamController,
        detectChanges: () => this.cdr.detectChanges(),
        isTextProcessing: this.isProcessing,
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

    this.assistantSignalR.proactiveMessage$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg) => {
        this.ngZone.run(() => {
          if (this.onboarding.isTourActive()) {
            this.pendingProactiveChatMessages.push(msg);
            return;
          }
          this.appendProactiveChatMessage(msg);
        });
      });

    this.assistantSignalR.onboardingPrompt$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg) => {
        this.ngZone.run(() => {
          if (this.onboarding.isTourActive()) {
            this.pendingProactiveChatMessages.push(msg);
            return;
          }
          this.appendProactiveChatMessage(msg);
        });
      });

    effect(() => {
      if (!this.onboarding.isTourActive() && this.pendingProactiveChatMessages.length > 0) {
        const queued = this.pendingProactiveChatMessages;
        this.pendingProactiveChatMessages = [];
        queued.forEach((msg) => this.appendProactiveChatMessage(msg));
      }
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

    effect(() => {
      if (this.onboarding.tourStartRequested() > 0) {
        this.restartGuidedTour();
      }
    });

    effect(() => {
      if (!this.asideService.isVisible()) {
        this.inboxLoadRequested = false;
        return;
      }
      if (this.onboarding.isTourActive() || this.inboxLoadRequested) {
        return;
      }
      this.inboxLoadRequested = true;
      this.loadProactiveInbox();
    });
  }

  private loadProactiveInbox(): void {
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
    const knownIds = new Set(this.messages.map((message) => message.id));
    const freshItems = items.filter((item) => !knownIds.has(item.id));
    if (freshItems.length > 0) {
      const inboxMessages = freshItems.map((item) => this.toInboxChatMessage(item));
      this.messages = [...this.messages, ...inboxMessages];
      this.inboxHeadingMessageId.set(inboxMessages[0].id);
      this.shouldScrollToBottom = true;
    }
    this.markInboxRead();
  }

  private toInboxChatMessage(item: IProactiveInboxItem): ChatMessage {
    const content = this.resolveProactiveContent(item.content, item.contentParams);
    return {
      id: item.id,
      sender: 'assistant',
      content,
      formattedContent: this.formatMessage(content),
      timestamp: new Date(item.createdUtc),
      messageKind: 'proactive',
      proactiveReaction: this.toProactiveReaction(item.reaction),
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

  private markInboxRead(): void {
    this.proactiveInboxService
      .markAllRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  private restartGuidedTour(): void {
    this.onboarding.accept();
    this.maybePostLlmOfflineHint();
    this.tourIndex = 0;
    this.presentStationAtCursor();
  }

  get messages(): readonly ChatMessage[] {
    return this.orchestrator.messages();
  }

  set messages(next: readonly ChatMessage[]) {
    this.orchestrator.replaceMessages(next);
  }

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
      .replace(AssistantChatComponent.TOOL_CALL_BLOCK_REGEX, '')
      .replace(AssistantChatComponent.TOOL_CALL_TRAILING_REGEX, '')
      .replace(AssistantChatComponent.INVOKE_BLOCK_REGEX, '')
      .replace(AssistantChatComponent.INVOKE_TRAILING_REGEX, '')
      .replace(AssistantChatComponent.METADATA_MARKER_REGEX, '')
      .replace(AssistantChatComponent.TRAILING_MARKER_REGEX, '')
      .trimEnd();
  }

  private static readonly PROACTIVE_I18N_MARKER = 'i18n:';

  private resolveProactiveContent(
    text: string,
    params?: Record<string, string>,
  ): string {
    const stripped = this.stripMetadataMarkers(text);
    if (stripped.startsWith(AssistantChatComponent.PROACTIVE_I18N_MARKER)) {
      return this.translateService.instant(
        stripped.slice(AssistantChatComponent.PROACTIVE_I18N_MARKER.length),
        params,
      );
    }
    return stripped;
  }

  private appendProactiveChatMessage(msg: IProactiveMessage): void {
    const content = this.resolveProactiveContent(msg.content, msg.contentParams);
    this.orchestrator.addMessage({
      id: msg.messageId,
      sender: 'assistant',
      content,
      formattedContent: this.formatMessage(content),
      timestamp: new Date(msg.timestamp),
      messageKind: msg.messageType,
      ...this.toProactiveActionFields(msg.kind, msg.actionRoute, msg.actionParams, msg.contentParams),
    });
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();
  }

  isMuteSuggestion(message: ChatMessage): boolean {
    return message.proactiveKind === PROACTIVE_TRIGGER_KIND.MuteSuggestion;
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

  async submitMuteSuggestion(message: ChatMessage): Promise<void> {
    if (message.messageKind !== 'proactive' || message.proactiveMuted) return;
    if (!message.proactiveMuteTargetKind) return;
    if (this.pendingMuteMessageId() !== null) return;

    this.pendingMuteMessageId.set(message.id);
    this.cdr.detectChanges();
    try {
      await firstValueFrom(this.assistantService.muteTriggerKind(message.proactiveMuteTargetKind));
      this.orchestrator.updateMessage(message.id, { proactiveMuted: true });
      this.toastShowService.showInfo(
        this.translateService.instant(PROACTIVE_MUTE_CONFIRMED_KEY),
      );
    } catch {
      this.toastShowService.showError(
        this.translateService.instant(PROACTIVE_REACTION_ERROR_KEY),
      );
    } finally {
      this.pendingMuteMessageId.set(null);
      this.cdr.detectChanges();
    }
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
      messagesContainer.nativeElement.scrollTop =
        messagesContainer.nativeElement.scrollHeight;
    }
  }

  private interruptCurrentStream(): void {
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
    this.isProcessing.set(false);
    this.toolSteps.set([]);
    this.streamBuffer = '';
    this.streamPreviousClean = '';
    this.currentRawStream = '';
    this.scrollMarkersDispatched = 0;
    this.klacksyNavigation.clearExplainScrollQueue();
  }

  private addToolStep(functionName: string): void {
    this.toolSteps.update((steps) => [
      ...steps,
      { functionName, key: this.toolStatusKey(functionName), done: false },
    ]);
  }

  private markToolStepDone(functionName: string): void {
    this.toolSteps.update((steps) => {
      let idx = steps.findIndex((s) => !s.done && s.functionName === functionName);
      if (idx < 0) {
        idx = steps.findIndex((s) => !s.done);
      }
      if (idx < 0) return steps;
      const next = steps.slice();
      next[idx] = { ...next[idx], done: true };
      return next;
    });
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
    this.shouldScrollToBottom = true;

    const ttsDelta =
      nextContent.length > previousClean.length && nextContent.startsWith(previousClean)
        ? nextContent.substring(previousClean.length)
        : '';
    this.streamPreviousClean = nextContent;

    const ttsClean = this.stripForTts(ttsDelta);
    if (ttsClean) {
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

    if (this.isProcessing()) {
      this.interruptCurrentStream();
    }
    this.ttsService.interrupt();
    this.orchestrator.stopAutoSpeak();

    const userContent = this.inputText().trim();
    const userMessage: ChatMessage = {
      id: this.generateMessageId(),
      sender: 'user',
      content: userContent,
      formattedContent: this.formatMessage(userContent),
      timestamp: new Date(),
    };

    this.orchestrator.addMessage(userMessage);
    if (!this.isTourStationPending) {
      this.toastShowService.dismissInteractiveReplies();
    }
    const messageText = this.inputText();
    this.inputText.set('');
    this.isProcessing.set(true);
    this.toolSteps.set([]);
    this.shouldScrollToBottom = true;

    const assistantMessageId = this.generateMessageId();
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
    this.currentRawStream = '';
    this.streamBuffer = '';
    this.streamPreviousClean = '';
    this.scrollMarkersDispatched = 0;
    if (this.streamRafHandle !== null) {
      cancelAnimationFrame(this.streamRafHandle);
      this.streamRafHandle = null;
    }
    this.cdr.detectChanges();

    const voiceModeActive =
      this.orchestrator.voiceModeEnabled() ||
      this.appSettings.speechSettings().outputMode === OutputMode.BothAuto;
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
            this.orchestrator.onStreamFunctionCall();
            this.addToolStep(data.functionName);
            this.shouldScrollToBottom = true;
            this.cdr.detectChanges();
          });
        },
        onFunctionResult: (data: { functionName: string }) => {
          this.ngZone.run(() => {
            this.markToolStepDone(data.functionName);
            this.cdr.detectChanges();
          });
        },
        onContent: (text: string) => {
          if (this.toolSteps().length > 0) {
            this.toolSteps.set([]);
            this.orchestrator.onStreamPlanningEnded();
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
            this.shouldScrollToBottom = true;

            const offerableNavigateTo = this.offerableNavigateTo(data);
            if (this.isTourStationPending && this.tourIndex < ONBOARDING_STATIONS.length) {
              this.showStationChips(ONBOARDING_STATIONS[this.tourIndex]);
            } else if (data.suggestedReplies) {
              this.showRepliesAsToast(data.suggestedReplies);
            } else if (offerableNavigateTo || (data.suggestions && data.suggestions.length > 0)) {
              this.showActionsAsToast(data.suggestions, offerableNavigateTo);
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
            this.shouldScrollToBottom = true;
            this.isProcessing.set(false);
            this.toolSteps.set([]);
            this.currentStreamController = null;
            this.cdr.detectChanges();
            this.orchestrator.onStreamDone();
            this.maybeAutoSpeak(doneMessage);
            setTimeout(() => this.chatInput()?.nativeElement?.focus(), 0);
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
            this.shouldScrollToBottom = true;
            this.isProcessing.set(false);
            this.toolSteps.set([]);
            this.currentStreamController = null;
            this.cdr.detectChanges();
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
    this.orchestrator.stopAutoSpeak();
    const currentLang = this.translateService.currentLang || this.translateService.defaultLang;
    const locale = this.languageMappingService.getSpeechLocale(currentLang);
    const cleaned = this.stripForTts(this.stripMetadataMarkers(message.content));
    this.ttsService.speak(cleaned, message.id, locale);
  }

  private maybeAutoSpeak(message: ChatMessage | undefined): void {
    if (this.orchestrator.isAutoSpeakStreaming()) {
      return;
    }
    if (
      message &&
      !this.voiceModeEnabled &&
      this.appSettings.speechSettings().outputMode === OutputMode.BothAuto
    ) {
      this.speakMessage(message);
    }
  }

  onSuggestionClick(suggestion: string): void {
    this.inputText.set(suggestion);
    this.sendMessage();
  }

  private showRepliesAsToast(config: ISuggestedRepliesConfig): void {
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(
      config,
      (values: string[]) => {
        this.ngZone.run(() => {
          if (values.length === 0) return;
          this.inputText.set(values.join(', '));
          this.sendMessage();
        });
      },
    );
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

  private showActionsAsToast(suggestions?: string[], navigateTo?: string | null): void {
    if (this.onboarding.isTourActive()) {
      this.toastShowService.dismissInteractiveReplies();
      return;
    }
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

  private showGreetingOptionsAsToast(options: ISuggestedReply[]): void {
    if (!options.length) return;
    if (this.onboarding.isTourActive()) {
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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

  async submitProactiveReaction(message: ChatMessage, reaction: ProactiveReaction): Promise<void> {
    if (message.messageKind !== 'proactive' || message.proactiveReaction) return;
    if (this.pendingReactionMessageId() !== null) return;

    this.pendingReactionMessageId.set(message.id);
    this.cdr.detectChanges();
    try {
      await firstValueFrom(this.assistantService.setProactiveReaction(message.id, reaction));
      this.orchestrator.updateMessage(message.id, { proactiveReaction: reaction });
    } catch {
      this.toastShowService.showError(
        this.translateService.instant(PROACTIVE_REACTION_ERROR_KEY),
      );
    } finally {
      this.pendingReactionMessageId.set(null);
      this.cdr.detectChanges();
    }
  }

  toggleModelDropdown(): void {
    this.showModelDropdown.update((v) => !v);
  }

  selectModel(modelId: string): void {
    this.assistantService.setCurrentModel(modelId);
    this.currentModel.set(modelId);
    this.showModelDropdown.set(false);
    this.assistantService.warmupCache();
  }

  getCurrentModelInfo(): IAssistantModel | undefined {
    return this.assistantService.getModelInfo(this.currentModel());
  }

  formatCost(cost: number): string {
    return `€${cost.toFixed(4)}/1K tokens`;
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
    this.shouldScrollToBottom = true;
    this.showActionsAsToast(placeholder.suggestions);

    this.welcomeGreetingService.fetchWelcome()
      .pipe(takeUntilDestroyed(this.destroyRef))
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
    this.shouldScrollToBottom = true;

    if (this.asideService.isVisible()) {
      this.maybeAutoSpeak(this.orchestrator.messages().find((m) => m.id === messageId));
      this.greetingSpoken = true;
      if (greetingOptions.length > 0) {
        this.showGreetingOptionsAsToast(greetingOptions);
      }
    } else {
      this.pendingGreetingMessageId = messageId;
      this.pendingGreetingOptions = greetingOptions;
    }

    this.onboarding.applyWelcome(response.onboarding);
    this.maybeOfferOnboarding();
  }

  private maybeOfferOnboarding(): void {
    if (!this.onboarding.shouldOffer() || this.onboarding.hasOfferedThisSession()) {
      return;
    }
    this.onboarding.markOfferedThisSession();
    this.maybePostLlmOfflineHint();
    this.showOnboardingOffer();
  }

  private maybePostLlmOfflineHint(): void {
    if (this.llmOfflineHintShown || this.onboarding.llmLive()) {
      return;
    }
    this.llmOfflineHintShown = true;
    this.postKlacksyMessage(this.translateService.instant(ONBOARDING_LLM_OFFLINE_KEY));
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
    let resolved = false;
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(
      config,
      (values: string[]) => {
        resolved = true;
        this.ngZone.run(() => {
          if (values.length === 0) return;
          this.handleOnboardingChoice(values[0]);
        });
      },
      () => {
        if (resolved) return;
        this.ngZone.run(() => this.onboarding.snooze());
      },
    );
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
    this.maybePostLlmOfflineHint();
    this.tourIndex = this.onboarding.firstPendingIndex();
    this.presentStationAtCursor();
  }

  resumeTourOneStepBack(): void {
    this.onboarding.accept();
    this.maybePostLlmOfflineHint();
    const currentPosition = this.liveTourStep() ?? this.onboarding.firstPendingIndex();
    this.tourIndex = Math.max(0, currentPosition - 1);
    this.presentStationAtCursor();
  }

  dismissOnboarding(): void {
    this.onboarding.dismiss();
  }

  private presentStationAtCursor(): void {
    this.isTourStationPending = false;
    this.liveTourStep.set(this.tourIndex);
    if (this.tourIndex >= ONBOARDING_STATIONS.length) {
      this.completeTour();
      return;
    }
    const station = ONBOARDING_STATIONS[this.tourIndex];
    this.klacksyNavigation.navigateAndScroll(station.route ?? ONBOARDING_SETTINGS_ROUTE, station.target || undefined);
    this.klacksyNavigation.highlightNavIcon(station.navIconId);
    this.postKlacksyMessage(this.translateService.instant(station.explainKey));
    if (station.type === 'ask' && station.id === ONBOARDING_STATION_DEFAULT_LANGUAGE) {
      this.showLanguageChoiceChips(station);
      return;
    }
    this.maybePostFreeProviderHint(station);
    this.maybePostDoubleClickEditHint(station);
    this.showStationChips(station);
  }

  private maybePostFreeProviderHint(station: IOnboardingStation): void {
    if (station.id !== ONBOARDING_STATION_LLM_PROVIDER || this.onboarding.llmLive()) {
      return;
    }
    this.postKlacksyMessage(this.translateService.instant(ONBOARDING_LLM_FREE_PROVIDERS_KEY));
  }

  private maybePostDoubleClickEditHint(station: IOnboardingStation): void {
    if (station.id !== ONBOARDING_STATION_TITLE) {
      return;
    }
    this.postKlacksyMessage(this.translateService.instant(ONBOARDING_DOUBLE_CLICK_EDIT_HINT_KEY));
  }

  private showLanguageChoiceChips(station: IOnboardingStation): void {
    const field = onboardingAskFields(station.id)[0];
    this.postKlacksyMessage(this.translateService.instant(field.promptKey));
    const options: ISuggestedReply[] = [];
    if (this.tourIndex > 0) {
      options.push({ label: this.translateService.instant('assistant-chat.onboarding.tour.back'), value: ONBOARDING_TOUR_CHOICE.Back });
    }
    options.push(
      ...this.languageConfigService.getSupportedLanguages().map((code) => ({
        label: this.languageConfigService.getDisplayName(code),
        value: code,
      })),
      { label: this.translateService.instant('assistant-chat.onboarding.tour.skip'), value: ONBOARDING_TOUR_CHOICE.Skip },
      { label: this.translateService.instant('assistant-chat.onboarding.tour.end'), value: ONBOARDING_TOUR_CHOICE.End },
    );
    const config: ISuggestedRepliesConfig = {
      selectionMode: 'single',
      options,
    };
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(config, (values: string[]) => {
      this.ngZone.run(() => {
        if (values.length === 0) return;
        this.handleLanguageChoice(station.id, field, values[0]);
      });
    });
    this.isTourStationPending = true;
  }

  private handleLanguageChoice(stationId: string, field: IOnboardingAskField, choice: string): void {
    if (choice === ONBOARDING_TOUR_CHOICE.Back) {
      this.retreatTour();
      return;
    }
    if (choice === ONBOARDING_TOUR_CHOICE.Skip) {
      this.advanceTour();
      return;
    }
    if (choice === ONBOARDING_TOUR_CHOICE.End) {
      this.endTour();
      return;
    }
    this.onboarding.writeField(field, choice).subscribe({
      next: () => this.ngZone.run(() => this.finishStationChoice(stationId)),
      error: () => this.ngZone.run(() => this.finishStationChoice(stationId)),
    });
  }

  private showStationChips(station: IOnboardingStation): void {
    const options: ISuggestedReply[] = [];
    if (this.tourIndex > 0) {
      options.push({ label: this.translateService.instant('assistant-chat.onboarding.tour.back'), value: ONBOARDING_TOUR_CHOICE.Back });
    }
    options.push(
      { label: this.translateService.instant('assistant-chat.onboarding.tour.done'), value: ONBOARDING_TOUR_CHOICE.Done },
      { label: this.translateService.instant('assistant-chat.onboarding.tour.skip'), value: ONBOARDING_TOUR_CHOICE.Skip },
      { label: this.translateService.instant('assistant-chat.onboarding.tour.end'), value: ONBOARDING_TOUR_CHOICE.End },
    );
    const config: ISuggestedRepliesConfig = {
      selectionMode: 'single',
      options,
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

  private handleStationChoice(station: IOnboardingStation, choice: string): void {
    if (choice === ONBOARDING_TOUR_CHOICE.Back) {
      this.retreatTour();
      return;
    }
    if (choice !== ONBOARDING_TOUR_CHOICE.Done && choice !== ONBOARDING_TOUR_CHOICE.Skip) {
      this.endTour();
      return;
    }
    const completedStationId = choice === ONBOARDING_TOUR_CHOICE.Done ? station.id : undefined;
    if (station.id === ONBOARDING_STATION_LLM_PROVIDER && !this.onboarding.llmLive()) {
      this.recheckLlmThenAdvance(completedStationId);
      return;
    }
    if (completedStationId && station.type === 'ask') {
      void this.appSettings.saveImmediately().then(() =>
        this.ngZone.run(() => this.finishStationChoice(completedStationId)),
      );
      return;
    }
    this.finishStationChoice(completedStationId);
  }

  private finishStationChoice(completedStationId?: string): void {
    if (completedStationId) {
      this.onboarding.markStationCompleted(completedStationId);
    }
    this.advanceTour();
  }

  private recheckLlmThenAdvance(completedStationId?: string): void {
    this.onboarding
      .refreshState(completedStationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () =>
        this.ngZone.run(() => {
          const key = this.onboarding.llmLive()
            ? ONBOARDING_LLM_ONLINE_KEY
            : ONBOARDING_LLM_STILL_OFFLINE_KEY;
          this.postKlacksyMessage(this.translateService.instant(key));
          this.advanceTour();
        }),
      error: () =>
        this.ngZone.run(() => {
          if (completedStationId) {
            this.onboarding.markStationCompleted(completedStationId);
          }
          this.advanceTour();
        }),
    });
  }

  private advanceTour(): void {
    this.tourIndex += 1;
    this.presentStationAtCursor();
  }

  private retreatTour(): void {
    this.tourIndex = Math.max(0, this.tourIndex - 1);
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

    const lines = escaped.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

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

      if (this.isTableRow(trimmed) && this.isTableRow(lines[i + 1]?.trim()) && this.isTableSeparatorRow(lines[i + 1].trim())) {
        flushText();
        closeList();
        const headerCells = this.parseTableRow(trimmed);
        const bodyRows: string[][] = [];
        let j = i + 2;
        while (j < lines.length && this.isTableRow(lines[j].trim()) && !this.isTableSeparatorRow(lines[j].trim())) {
          bodyRows.push(this.parseTableRow(lines[j].trim()));
          j++;
        }
        blocks.push(this.buildTableHtml(headerCells, bodyRows));
        i = j - 1;
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

      textBuffer.push(lines[i]);
    }

    flushText();
    closeList();

    return blocks.join('')
      .replace(MARKDOWN_LINK_REGEX, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
      .replace(/`([^`\n]+?)`/g, '<code>$1</code>');
  }

  private static readonly TABLE_SEPARATOR_CELL_REGEX = /^:?-+:?$/;

  private isTableRow(line: string | undefined): boolean {
    return !!line && line.startsWith('|') && line.length > 1;
  }

  private isTableSeparatorRow(line: string): boolean {
    const cells = this.parseTableRow(line);
    return cells.length > 0 && cells.every((cell) => AssistantChatComponent.TABLE_SEPARATOR_CELL_REGEX.test(cell));
  }

  private parseTableRow(line: string): string[] {
    let inner = line;
    if (inner.startsWith('|')) inner = inner.slice(1);
    if (inner.endsWith('|')) inner = inner.slice(0, -1);
    return inner.split('|').map((cell) => cell.trim());
  }

  private buildTableHtml(headerCells: string[], bodyRows: string[][]): string {
    const headerHtml = headerCells.map((cell) => `<th>${cell}</th>`).join('');
    const bodyHtml = bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('');
    return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
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

  /**
   * Resolves the user's language, preferring the persisted choice: in floating voice
   * modes this component bootstraps before the translate service has a current language.
   */
  private resolveCurrentLang(): string {
    return (
      this.localStorageService.get(StorageKeys.CURRENT_LANG) ||
      this.translateService.currentLang ||
      this.translateService.defaultLang
    );
  }

  /**
   * Surfaces orchestrator voice errors in the classic chat panel, where no voice-shell
   * icon exists to blink. Floating modes keep the shell's own error visuals instead.
   * @param hint - Error hint emitted by the conversation orchestrator
   */
  private onVoiceErrorHint(hint: IVoiceShellErrorHint): void {
    const mode = this.appSettings.speechSettings().outputMode;
    if (mode === OutputMode.Audio || mode === OutputMode.BothAuto) {
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
    this.isTourStationPending = false;
    this.inboxHeadingMessageId.set(null);
    this.orchestrator.clearMessages();
    this.toastShowService.dismissInteractiveReplies();

    this.assistantService.clearConversation(this.conversationId);

    this.conversationId = this.generateConversationId();

    const currentLang =
      this.translateService.currentLang || this.translateService.defaultLang;
    this.addWelcomeMessage(currentLang);

    this.shouldScrollToBottom = true;
  }

  isUsingWhisper(): boolean {
    return this.speechService.getDiagnostics().useWhisperFallback;
  }

  onPlanApprove(planId: string): void {
    this.planService.approve(planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.ngZone.run(() => {
          this.toastShowService.showError(
            this.translateService.instant('assistant-chat.plan-execution.approve-error'),
          );
          this.cdr.detectChanges();
        }),
      });
  }

  onPlanAbort(planId: string): void {
    this.planService.abort(planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error: unknown) => this.ngZone.run(() => {
          const messageKey = error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict
            ? 'assistant-chat.plan-execution.abort-conflict'
            : 'assistant-chat.plan-execution.abort-error';
          this.toastShowService.showError(this.translateService.instant(messageKey));
          this.cdr.detectChanges();
        }),
      });
  }
}
