/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
  ViewChild,
  ElementRef,
  AfterViewChecked,
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
import { DataManagementLLMService } from 'src/app/domain/services/llm/data-management-llm.service';
import { ILLMModel } from 'src/app/infrastructure/api/data-llm.service';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { Router } from '@angular/router';
import { IconUserComponent } from '../../icons/icon-user.component';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';
import { IconMMLComponent } from '../../icons/icon-mml.component';
import { IconChatComponent } from '../../icons/icon-chat.component';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  navigateTo?: string;
  actionPerformed?: boolean;
}

@Component({
  selector: 'app-llm-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TranslateModule,
    IconMMLComponent,
    IconUserComponent,
  ],
  templateUrl: './llm-chat.component.html',
  styleUrls: ['./llm-chat.component.scss'],
})
export class LLMChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private llmService = inject(DataManagementLLMService);
  speechService = inject(SpeechRecognitionService);
  private translateService = inject(TranslateService);
  private languageMappingService = inject(LanguageMappingService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  private shouldScrollToBottom = true;

  faMicrophone = faMicrophone;
  faMicrophoneSlash = faMicrophoneSlash;
  faPaperPlane = faPaperPlane;
  faUser = faUser;
  faTimes = faTimes;
  faChevronDown = faChevronDown;

  messages: ChatMessage[] = [];
  inputText = '';
  isListening = false;
  isProcessing = false;
  conversationId = '';

  availableModels: ILLMModel[] = [];
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

    this.llmService
      .getAvailableModels()
      .pipe(takeUntil(this.destroy$))
      .subscribe((models) => {
        this.availableModels = models.filter((model) => model.isEnabled);
      });

    this.llmService
      .getCurrentModelId()
      .pipe(takeUntil(this.destroy$))
      .subscribe((modelId) => {
        this.currentModel = modelId;
      });
  }

  ngOnDestroy(): void {
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

    try {
      const response = await firstValueFrom(
        this.llmService.sendMessage(messageText, this.conversationId)
      );

      const assistantMessage: ChatMessage = {
        id: this.generateMessageId(),
        sender: 'assistant',
        content: response?.message || '',
        timestamp: new Date(),
        suggestions: response?.suggestions,
        navigateTo: response?.navigateTo,
        actionPerformed: response?.actionPerformed,
      };

      this.messages.push(assistantMessage);
      this.shouldScrollToBottom = true;

      if (response?.navigateTo && response?.actionPerformed) {
        setTimeout(() => {
          this.router.navigate([response.navigateTo!]);
        }, 2000);
      }
    } catch (error: any) {
      let errorContent = '';
      if (error?.error?.message) {
        errorContent = error.error.message;
      } else if (error?.message) {
        errorContent = error.message;
      } else {
        errorContent = this.translateService.instant('llm-chat.error.generic');
      }

      const errorMessage: ChatMessage = {
        id: this.generateMessageId(),
        sender: 'assistant',
        content: '❌ ' + errorContent,
        timestamp: new Date(),
      };
      this.messages.push(errorMessage);
      this.shouldScrollToBottom = true;
    } finally {
      this.isProcessing = false;
    }
  }

  async startVoiceInput(): Promise<void> {
    if (this.isListening || !this.speechService.isSupported$()) {
      return;
    }

    try {
      const hasPermission = await this.speechService.requestPermissions();

      if (!hasPermission) {
        alert(
          this.translateService.instant('llm-chat.error.microphone-permission')
        );
        return;
      }
    } catch {
      alert(this.translateService.instant('llm-chat.error.microphone-access'));
      return;
    }

    const currentLang =
      this.translateService.currentLang || this.translateService.defaultLang;
    const speechLang = this.getSpeechLanguageCode(currentLang);

    this.isListening = true;
    this.speechService
      .startListening(speechLang)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (text: string) => {
          this.inputText = text;
          this.isListening = false;
        },
        error: () => {
          this.isListening = false;
        },
      });

    this.speechService.errors
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        alert(
          this.translateService.instant('llm-chat.error.speech-error') +
            error +
            '\n\n' +
            this.translateService.instant('llm-chat.error.browser-language') +
            (navigator.language || 'unknown') +
            '\n' +
            this.translateService.instant(
              'llm-chat.error.available-languages'
            ) +
            (navigator.languages ? navigator.languages.join(', ') : 'unknown')
        );
      });
  }

  stopVoiceInput(): void {
    this.speechService.stopListening();
    this.isListening = false;
  }

  onSuggestionClick(suggestion: string): void {
    this.inputText = suggestion;
    this.sendMessage();
  }

  onNavigateClick(navigateTo: string): void {
    this.router.navigate([navigateTo]);
  }

  toggleModelDropdown(): void {
    this.showModelDropdown = !this.showModelDropdown;
  }

  selectModel(modelId: string): void {
    this.llmService.setCurrentModel(modelId);
    this.currentModel = modelId;
    this.showModelDropdown = false;
  }

  getCurrentModelInfo(): ILLMModel | undefined {
    return this.llmService.getModelInfo(this.currentModel);
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

  private addWelcomeMessage(langCode: string): void {
    const welcomeMessage: ChatMessage = {
      id: this.generateMessageId(),
      sender: 'assistant',
      content: this.translateService.instant('llm-chat.welcome.content'),
      timestamp: new Date(),
      suggestions: [
        this.translateService.instant('llm-chat.welcome.suggestion-1'),
        this.translateService.instant('llm-chat.welcome.suggestion-2'),
        this.translateService.instant('llm-chat.welcome.suggestion-3'),
        this.translateService.instant('llm-chat.welcome.suggestion-4'),
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
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }

  private updateSpeechLanguage(langCode: string): void {
    const speechLang = this.getSpeechLanguageCode(langCode);
    this.speechService.setLanguage(speechLang);

    this.updateLLMLanguage(langCode);
  }

  private updateLLMLanguage(langCode: string): void {
    this.llmService.setLanguage(langCode);
  }

  private getSpeechLanguageCode(langCode: string): string {
    return this.languageMappingService.getSpeechLocale(langCode);
  }

  clearChat(): void {
    this.messages = [];

    this.llmService.clearConversation(this.conversationId);

    this.conversationId = this.generateConversationId();

    const currentLang =
      this.translateService.currentLang || this.translateService.defaultLang;
    this.addWelcomeMessage(currentLang);

    this.shouldScrollToBottom = true;
  }
}
