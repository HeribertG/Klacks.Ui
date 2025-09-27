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
import { DataManagementLLMService } from 'src/app/domain/services/data-management-llm.service';
import { ILLMModel } from 'src/app/infrastructure/api/data-llm.service';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { Router } from '@angular/router';
import { IconChatComponent } from '../../icons/icon-chat.component';
import { IconUserComponent } from '../../icons/icon-user.component';

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
    IconChatComponent,
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

    this.speechService.isSupported$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isSupported) => {
        if (!isSupported) {
          // Speech recognition not supported
        }
      });

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
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      // Error scrolling to bottom
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

    if (this.isListening || !this.speechService.isSupported$.value) {
      return;
    }

    try {
      const hasPermission = await this.speechService.requestPermissions();

      if (!hasPermission) {
        alert(
          'Mikrofon-Berechtigung erforderlich! Bitte erlauben Sie den Zugriff auf das Mikrofon in den Browser-Einstellungen.'
        );
        return;
      }
    } catch (error) {
      alert(
        'Fehler beim Zugriff auf das Mikrofon. Überprüfen Sie Ihre Browser-Einstellungen.'
      );
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
        error: (error) => {
          this.isListening = false;
        },
      });

    this.speechService.errors
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        alert(
          'Speech Error: ' +
            error +
            '\n\nBrowser-Sprache: ' +
            (navigator.language || 'unknown') +
            '\nVerfügbare Sprachen: ' +
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
    const welcomeMessages: { [key: string]: any } = {
      de: {
        content:
          '👋 Hallo! Ich bin Ihr Assistent. Ich kann Ihnen helfen:\n\n' +
          '• Mitarbeiter zu erstellen\n' +
          '• Nach Personen zu suchen\n' +
          '• Verträge zu verwalten\n\n' +
          'Sie können mit mir sprechen oder tippen. Versuchen Sie: "Erstelle Mitarbeiter Max Muster"',
        suggestions: [
          'Erstelle einen neuen Mitarbeiter',
          'Suche nach Personen aus Zürich',
          'Zeige mir die Hilfe',
          'Was kannst du alles?',
        ],
      },
      en: {
        content:
          '👋 Hello! I am your Assistant. I can help you:\n\n' +
          '• Create employees\n' +
          '• Search for people\n' +
          '• Manage contracts\n\n' +
          'You can speak to me or type. Try: "Create employee Max Muster"',
        suggestions: [
          'Create a new employee',
          'Search for people from Zurich',
          'Show me the help',
          'What can you do?',
        ],
      },
      fr: {
        content:
          '👋 Bonjour! Je suis votre Assistant. Je peux vous aider à:\n\n' +
          '• Créer des employés\n' +
          '• Chercher des personnes\n' +
          '• Gérer des contrats\n\n' +
          'Vous pouvez me parler ou taper. Essayez: "Créer employé Max Muster"',
        suggestions: [
          'Créer un nouvel employé',
          'Chercher des personnes de Zurich',
          "Montrez-moi l'aide",
          'Que pouvez-vous faire?',
        ],
      },
      it: {
        content:
          '👋 Ciao! Sono il vostro Assistente. Posso aiutarvi a:\n\n' +
          '• Creare dipendenti\n' +
          '• Cercare persone\n' +
          '• Gestire contratti\n\n' +
          'Potete parlarmi o digitare. Provate: "Crea dipendente Max Muster"',
        suggestions: [
          'Crea un nuovo dipendente',
          'Cerca persone da Zurigo',
          "Mostrami l'aiuto",
          'Cosa puoi fare?',
        ],
      },
    };

    const welcomeData = welcomeMessages[langCode] || welcomeMessages['de'];
    const welcomeMessage: ChatMessage = {
      id: this.generateMessageId(),
      sender: 'assistant',
      content: welcomeData.content,
      timestamp: new Date(),
      suggestions: welcomeData.suggestions,
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
    const llmLanguageMapping: { [key: string]: string } = {
      en: 'English',
      de: 'German',
      fr: 'French',
      it: 'Italian',
    };

    const llmLanguage = llmLanguageMapping[langCode] || 'German';
    this.llmService.setLanguage(llmLanguage);
  }

  private getSpeechLanguageCode(langCode: string): string {
    const languageMapping: { [key: string]: string } = {
      en: 'en-US',
      de: 'de-CH',
      fr: 'fr',
      it: 'it',
    };

    return languageMapping[langCode] || 'de-CH';
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
