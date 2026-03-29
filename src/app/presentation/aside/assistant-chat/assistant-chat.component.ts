// Copyright (c) Heribert Gasparoli Private. All rights reserved.

﻿import {
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
} from '@fortawesome/free-solid-svg-icons';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { Router } from '@angular/router';
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
import { VoiceModeService } from './services/voice-mode.service';
import { ChatFunctionExecutionService } from './services/chat-function-execution.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType, AddressValidationFailedEvent } from 'src/app/domain/events/domain-events';
import { StreamMetadata } from 'src/app/infrastructure/api/assistant/data-assistant-stream.service';

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
    VoiceModeService,
    ChatFunctionExecutionService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private assistantService = inject(DataManagementAssistantService);
  private assistantProviderService = inject(DataManagementAssistantProviderService);
  private chatFunctionExecution = inject(ChatFunctionExecutionService);
  private voiceModeService = inject(VoiceModeService);
  private asideService = inject(AsideService);
  speechService = inject(SpeechRecognitionService);
  private translateService = inject(TranslateService);
  private languageMappingService = inject(LanguageMappingService);
  private router = inject(Router);
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

  faMicrophone = faMicrophone;
  faMicrophoneSlash = faMicrophoneSlash;
  faPaperPlane = faPaperPlane;
  faUser = faUser;
  faTimes = faTimes;
  faChevronDown = faChevronDown;

  activeSuggestedReplies = signal<ISuggestedRepliesConfig | null>(null);

  messages: ChatMessage[] = [];
  inputText = '';
  isProcessing = false;
  conversationId = '';
  private currentStreamController: AbortController | null = null;

  get voiceModeEnabled(): boolean {
    return this.voiceModeService.voiceModeEnabled;
  }

  get isListening(): boolean {
    return this.voiceModeService.isListening;
  }

  get isTranscribing(): boolean {
    return this.voiceModeService.isTranscribing;
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

    this.voiceModeService.initialize(
      {
        getInputText: () => this.inputText,
        setInputText: (text: string) => { this.inputText = text; },
        sendMessage: () => this.sendMessage(),
        getIsProcessing: () => this.isProcessing,
        detectChanges: () => this.cdr.detectChanges(),
      },
      this.destroy$,
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
          this.messages.push({
            id: msg.messageId,
            sender: 'assistant',
            content: msg.content,
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
          this.messages.push({
            id: msg.messageId,
            sender: 'assistant',
            content: msg.content,
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
    this.currentStreamController?.abort();
    this.voiceModeService.disableVoiceMode();
    this.destroy$.next();
    this.destroy$.complete();
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

    this.messages.push(userMessage);
    const messageText = this.inputText;
    this.inputText = '';
    this.isProcessing = true;
    this.shouldScrollToBottom = true;

    const assistantMessage: ChatMessage = {
      id: this.generateMessageId(),
      sender: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    this.messages.push(assistantMessage);
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
          this.ngZone.run(() => {
            assistantMessage.content += text;
            assistantMessage.isStreaming = true;
            this.shouldScrollToBottom = true;
            this.cdr.detectChanges();
          });
        },
        onMetadata: (data: StreamMetadata) => {
          this.ngZone.run(() => {
            assistantMessage.isStreaming = false;
            assistantMessage.suggestions = data.suggestedReplies ? undefined : data.suggestions;
            assistantMessage.suggestedReplies = data.suggestedReplies;
            assistantMessage.navigateTo = data.navigateTo;
            assistantMessage.actionPerformed = data.actionPerformed;

            if (data.suggestedReplies) {
              this.activeSuggestedReplies.set(data.suggestedReplies);
              this.showRepliesAsToast(data.suggestedReplies);
            }

            if (data.functionCalls && data.functionCalls.length > 0) {
              this.chatFunctionExecution.executeFunctionCalls(data.functionCalls, this.messages);
            } else if (data.navigateTo && data.actionPerformed && data.navigateTo.startsWith('/workplace/')) {
              setTimeout(() => {
                this.router.navigate([data.navigateTo!]);
              }, 2000);
            }

            this.cdr.detectChanges();
          });
        },
        onDone: () => {
          this.ngZone.run(() => {
            assistantMessage.isStreaming = false;
            this.isProcessing = false;
            this.currentStreamController = null;
            this.cdr.detectChanges();
          });
        },
        onError: (message: string) => {
          this.ngZone.run(() => {
            assistantMessage.isStreaming = false;
            if (!assistantMessage.content) {
              assistantMessage.content = message;
            } else {
              assistantMessage.content += '\n\n' + message;
            }
            this.isProcessing = false;
            this.currentStreamController = null;
            this.cdr.detectChanges();
          });
        },
      },
    );
  }

  async toggleVoiceMode(): Promise<void> {
    await this.voiceModeService.toggleVoiceMode();
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
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
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
    this.messages.push(welcomeMessage);
  }

  private updateWelcomeMessage(langCode: string): void {
    if (this.messages.length > 0 && this.messages[0].sender === 'assistant') {
      this.messages.splice(0, 1);
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
    const escaped = this.escapeForHtml(content);
    return escaped
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
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

    const welcomeIndex = this.messages.findIndex(
      (m) => m.sender === 'assistant' && m.suggestions && m.suggestions.length > 0
    );
    if (welcomeIndex === 0) {
      this.messages.splice(welcomeIndex, 1);
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

  private async sendHiddenMessage(prompt: string, suppressSuggestions: boolean = false): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const response = await firstValueFrom(
        this.assistantService.sendMessage(prompt, this.conversationId)
      );

      const assistantMessage: ChatMessage = {
        id: this.generateMessageId(),
        sender: 'assistant',
        content: response?.message || '',
        timestamp: new Date(),
        suggestions: suppressSuggestions ? undefined : (response?.suggestedReplies ? undefined : response?.suggestions),
        suggestedReplies: suppressSuggestions ? undefined : response?.suggestedReplies,
      };

      this.messages.push(assistantMessage);
      this.shouldScrollToBottom = true;

      if (response?.functionCalls && response.functionCalls.length > 0) {
        await this.chatFunctionExecution.executeFunctionCalls(response.functionCalls, this.messages);
      }
    } catch {
      this.messages.push({
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
    this.messages = [];
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
    return this.voiceModeService.isUsingWhisper();
  }
}
