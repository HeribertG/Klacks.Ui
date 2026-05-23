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
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { Router } from '@angular/router';
import { KlacksyNavigationService } from 'src/app/core/services/klacksy-navigation.service';
import { IconUserComponent } from '../../icons/icon-user.component';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';
import { IconMMLComponent } from '../../icons/icon-mml.component';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { AsideService } from '../aside.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { SuggestedRepliesOverlayComponent } from './suggested-replies-overlay/suggested-replies-overlay.component';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ChatMessage } from './chat-message.interface';
import { ConversationOrchestratorService, ConversationState } from './services/conversation-orchestrator.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { ChatFunctionExecutionService } from './services/chat-function-execution.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType, AddressValidationFailedEvent } from 'src/app/domain/events/domain-events';
import { StreamMetadata } from 'src/app/infrastructure/api/assistant/data-assistant-stream.service';
import { ISubmitCorrectionRequest } from 'src/app/infrastructure/api/assistant/data-assistant.service';

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
    SuggestedRepliesOverlayComponent,
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
  private router = inject(Router);
  private klacksyNavigation = inject(KlacksyNavigationService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private assistantSignalR = inject(AssistantSignalRService);
  private toastShowService = inject(ToastShowService);
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

  activeSuggestedReplies = signal<ISuggestedRepliesConfig | null>(null);
  correctionMenuMessageId = signal<string | null>(null);

  inputText = '';
  isProcessing = false;
  conversationId = '';
  private currentStreamController: AbortController | null = null;
  private currentRawStream = '';
  private streamBuffer = '';
  private streamRafHandle: number | null = null;
  private streamPreviousClean = '';

  private static readonly METADATA_MARKER_REGEX = /\[(SUGGESTIONS|REPLIES)(?::[^\]]*?)?\]/g;
  private static readonly TRAILING_MARKER_REGEX = /\[(SUGGESTIONS|REPLIES)(?::[\s\S]*)?$/;
  private static readonly FAST_PATH_NAVIGATE_DELAY_MS = 0;

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
    this.addWelcomeMessage(currentLang);

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
          this.orchestrator.addMessage({
            id: msg.messageId,
            sender: 'assistant',
            content: this.stripMetadataMarkers(msg.content),
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
          this.orchestrator.addMessage({
            id: msg.messageId,
            sender: 'assistant',
            content: this.stripMetadataMarkers(msg.content),
            timestamp: new Date(msg.timestamp),
          });
          this.shouldScrollToBottom = true;
          this.cdr.detectChanges();
        });
      });

    this.eventBus.on<AddressValidationFailedEvent>(DomainEventType.ADDRESS_VALIDATION_FAILED)
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.ngZone.run(() => {
          this.handleAddressValidationForChat(event);
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
      : nextContent;
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

    const userMessage: ChatMessage = {
      id: this.generateMessageId(),
      sender: 'user',
      content: this.inputText.trim(),
      timestamp: new Date(),
    };

    this.orchestrator.addMessage(userMessage);
    const messageText = this.inputText;
    this.inputText = '';
    this.isProcessing = true;
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
        onContent: (text: string) => {
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
              suggestions: data.suggestedReplies ? undefined : data.suggestions,
              suggestedReplies: data.suggestedReplies,
              navigateTo: data.navigateTo,
              actionPerformed: data.actionPerformed,
            });

            if (data.suggestedReplies) {
              this.activeSuggestedReplies.set(data.suggestedReplies);
              this.showRepliesAsToast(data.suggestedReplies);
            }

            if (data.functionCalls && data.functionCalls.length > 0) {
              this.chatFunctionExecution.executeFunctionCalls(data.functionCalls);
            } else if (data.navigateTo && data.actionPerformed && data.navigateTo.startsWith('/workplace/')) {
              const navigateTo = data.navigateTo;
              const target = data.target;
              setTimeout(() => {
                if (target) {
                  this.klacksyNavigation.navigateAndScroll(navigateTo, target);
                } else {
                  this.router.navigate([navigateTo]);
                }
              }, AssistantChatComponent.FAST_PATH_NAVIGATE_DELAY_MS);
            }

            this.cdr.detectChanges();
          });
        },
        onDone: () => {
          this.ngZone.run(() => {
            this.drainStreamBuffer(assistantMessageId);
            this.orchestrator.updateMessage(assistantMessageId, { isStreaming: false });
            this.isProcessing = false;
            this.currentStreamController = null;
            this.cdr.detectChanges();
            this.orchestrator.onStreamDone();
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
            });
            this.isProcessing = false;
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

  onReplySelected(values: string[]): void {
    this.activeSuggestedReplies.set(null);
    this.toastShowService.dismissInteractiveReplies();
    if (values.length === 0) return;
    this.inputText = values.join(', ');
    this.sendMessage();
  }

  onRepliesDismissed(): void {
    this.activeSuggestedReplies.set(null);
    this.toastShowService.dismissInteractiveReplies();
  }

  private showRepliesAsToast(config: ISuggestedRepliesConfig): void {
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(
      config,
      (values: string[]) => {
        this.ngZone.run(() => {
          this.activeSuggestedReplies.set(null);
          if (values.length === 0) return;
          this.inputText = values.join(', ');
          this.sendMessage();
        });
      },
      () => {
        this.ngZone.run(() => {
          this.activeSuggestedReplies.set(null);
        });
      },
    );
  }

  onNavigateClick(navigateTo: string): void {
    if (navigateTo.startsWith('/workplace/')) {
      this.router.navigate([navigateTo]);
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

  private addWelcomeMessage(_langCode: string): void {
    const welcomeMessage: ChatMessage = {
      id: this.generateMessageId(),
      sender: 'assistant',
      content: this.translateService.instant('assistant-chat.welcome.content'),
      timestamp: new Date(),
      suggestions: [
        this.translateService.instant('assistant-chat.welcome.suggestion-1'),
        this.translateService.instant('assistant-chat.welcome.suggestion-2'),
        this.translateService.instant('assistant-chat.welcome.suggestion-3'),
        this.translateService.instant('assistant-chat.welcome.suggestion-4'),
      ],
    };
    this.orchestrator.addMessage(welcomeMessage);
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

  private handleAddressValidationForChat(event: AddressValidationFailedEvent): void {
    if (this.isInitializing() || this.hasNoApiKey()) {
      return;
    }

    const current = this.orchestrator.messages();
    const welcomeIndex = current.findIndex(
      (m) => m.sender === 'assistant' && m.suggestions && m.suggestions.length > 0
    );
    if (welcomeIndex === 0) {
      this.orchestrator.replaceMessages(current.slice(1));
    }

    this.asideService.show(true);

    const parts = [
      event.street ? `Strasse: "${event.street}"` : '',
      event.zip ? `PLZ: "${event.zip}"` : '',
      event.city ? `Ort: "${event.city}"` : '',
      event.state ? `Kanton/Bundesland: "${event.state}"` : '',
      event.country ? `Land: "${event.country}"` : '',
    ].filter(Boolean).join(', ');

    const suggestionsText = event.suggestions.length > 0
      ? `\nNominatim-Vorschläge:\n${event.suggestions.map((s) => `- ${s.displayName}`).join('\n')}`
      : '';

    const prompt = `Die folgende Adresse konnte nicht verifiziert werden: ${parts}.${suggestionsText}
Pruefe die Adresse mit dem validate_address Skill und beachte dabei folgende Regeln:

- Wenn der Skill ein Ergebnis fuer "Canton" oder eine Region zurueckgibt, ist die PLZ GUELTIG. Behaupte dann NICHT, dass die PLZ falsch oder ungueltig ist.
- Vergleiche die vom Skill zurueckgegebene Region mit dem eingetragenen Kanton/Bundesland. Bei Abweichung: melde die korrekte Region.
- Bei MatchType "city_only": PLZ und Ort sind korrekt, nur Strasse oder Hausnummer wurde nicht gefunden.
- Bei MatchType "not_found": Die Kombination wurde beim Geocoding nicht gefunden.
- Fasse zusammen was korrekt ist, was falsch ist, und schlage eine korrigierte Adresse vor.`;

    this.sendHiddenMessage(prompt, true);
  }

  private async sendHiddenMessage(prompt: string, suppressSuggestions = false): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const response = await firstValueFrom(
        this.assistantService.sendMessage(prompt, this.conversationId)
      );

      const assistantMessage: ChatMessage = {
        id: this.generateMessageId(),
        sender: 'assistant',
        content: this.stripMetadataMarkers(response?.message || ''),
        timestamp: new Date(),
        suggestions: suppressSuggestions ? undefined : (response?.suggestedReplies ? undefined : response?.suggestions),
        suggestedReplies: suppressSuggestions ? undefined : response?.suggestedReplies,
      };

      this.orchestrator.addMessage(assistantMessage);
      this.shouldScrollToBottom = true;

      if (response?.functionCalls && response.functionCalls.length > 0) {
        await this.chatFunctionExecution.executeFunctionCalls(response.functionCalls);
      }
    } catch {
      this.orchestrator.addMessage({
        id: this.generateMessageId(),
        sender: 'assistant',
        content: this.translateService.instant('assistant-chat.error.generic'),
        timestamp: new Date(),
      });
      this.shouldScrollToBottom = true;
      this.cdr.detectChanges();
    } finally {
      this.isProcessing = false;
      this.cdr.detectChanges();
    }
  }

  clearChat(): void {
    this.orchestrator.clearMessages();
    this.activeSuggestedReplies.set(null);
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
