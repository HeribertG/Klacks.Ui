// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Chat component for the Klacksy AI assistant sidebar. The per-instance behaviour lives in the
 * component-scoped services listed in providers; this class renders them and handles the input row.
 * @param messagesContainer - Scrollable message list element
 * @param chatInput - Textarea element for user text input
 */
import {
  Component,
  inject,
  ElementRef,
  computed,
  ChangeDetectionStrategy,
  afterEveryRender,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import {
  faMicrophone,
  faMicrophoneSlash,
  faPaperPlane,
  faStop,
  faSpinner,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { DataManagementProactiveInboxService } from 'src/app/domain/services/assistant/data-management-proactive-inbox.service';
import { SpeechOutputModeService } from 'src/app/application/services/speech-output-mode.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { PlaygroundPromptGateService } from 'src/app/domain/services/playground/playground-prompt-gate.service';
import { PlaygroundNoticeComponent } from 'src/app/presentation/playground/playground-notice/playground-notice.component';
import { PlaygroundPromptCounterComponent } from 'src/app/presentation/playground/playground-prompt-counter/playground-prompt-counter.component';
import { isPrintableKey } from 'src/app/shared/helpers/keyboard.helper';
import { AssistantPanelsComponent } from './assistant-panels/assistant-panels.component';
import { AutonomyStatusBarComponent } from './autonomy-status-bar/autonomy-status-bar.component';
import { ChatMessageComponent } from './chat-message/chat-message.component';
import { ChatModelSelectorComponent } from './chat-model-selector/chat-model-selector.component';
import { ChatOnboardingCardComponent } from './chat-onboarding-card/chat-onboarding-card.component';
import { ChatMessage } from './chat-message.interface';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { ConversationOrchestratorService } from './services/conversation-orchestrator.service';
import { ConversationState } from './services/conversation-state.enum';
import { ChatTurnControlService } from './services/chat-turn-control.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { ChatFunctionExecutionService } from './services/chat-function-execution.service';
import { ChatTranscriptService } from './services/chat-transcript.service';
import { ChatComposerService } from './services/chat-composer.service';
import { ChatModelSelectionService } from './services/chat-model-selection.service';
import { ChatReplyToastService } from './services/chat-reply-toast.service';
import { ChatOnboardingTourService } from './services/chat-onboarding-tour.service';
import { ChatWelcomeService } from './services/chat-welcome.service';
import { ChatSessionService } from './services/chat-session.service';
import { ChatStreamBufferService } from './services/chat-stream-buffer.service';
import { ChatTurnStreamService } from './services/chat-turn-stream.service';
import { ChatLanguageSyncService } from './services/chat-language-sync.service';
import { ChatVoiceBridgeService } from './services/chat-voice-bridge.service';

const ENTER_KEY = 'Enter';
const SCROLL_BEHAVIOR_INSTANT = 'instant';

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
    ChatModelSelectorComponent,
    ChatOnboardingCardComponent,
    PlaygroundNoticeComponent,
    PlaygroundPromptCounterComponent,
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
    ChatWelcomeService,
    ChatSessionService,
    ChatStreamBufferService,
    ChatTurnStreamService,
    ChatLanguageSyncService,
    ChatVoiceBridgeService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantChatComponent {
  private readonly messagesContainer = viewChild.required<ElementRef>('messagesContainer');
  private readonly chatInput = viewChild<ElementRef<HTMLTextAreaElement>>('chatInput');

  private readonly transcript = inject(ChatTranscriptService);
  private readonly composer = inject(ChatComposerService);
  private readonly modelSelection = inject(ChatModelSelectionService);
  private readonly tour = inject(ChatOnboardingTourService);
  private readonly welcome = inject(ChatWelcomeService);
  private readonly session = inject(ChatSessionService);
  private readonly turnStream = inject(ChatTurnStreamService);
  private readonly languageSync = inject(ChatLanguageSyncService);
  private readonly voiceBridge = inject(ChatVoiceBridgeService);
  private readonly turnControl = inject(ChatTurnControlService);
  private readonly ttsService = inject(TextToSpeechService);
  private readonly outputModes = inject(SpeechOutputModeService);
  private readonly playgroundGate = inject(PlaygroundPromptGateService);
  readonly orchestrator = inject(ConversationOrchestratorService);
  readonly speechService = inject(SpeechRecognitionService);
  readonly proactiveInboxService = inject(DataManagementProactiveInboxService);
  readonly onboarding = inject(OnboardingService);
  readonly ConversationState = ConversationState;

  /**
   * In a floating mode the assistant's surfaces live in the overlay rail, because there is no chat
   * panel on screen to hold them, so the inline panels are not rendered here.
   */
  readonly isFloatingOutputMode = this.outputModes.isFloatingMode;

  readonly faMicrophone = faMicrophone;
  readonly faMicrophoneSlash = faMicrophoneSlash;
  readonly faPaperPlane = faPaperPlane;
  readonly faStop = faStop;
  readonly faSpinner = faSpinner;

  readonly inputText = this.composer.inputText;
  /** Backed by ChatTurnControlService: flips false the instant a stop begins, not only when the turn fully completes. */
  readonly isProcessing = this.turnControl.isTurnRunning;

  readonly maxPromptChars = this.playgroundGate.maxPromptChars;
  readonly playgroundConfirmationPending = this.playgroundGate.confirmationPending;

  readonly isInitializing = this.modelSelection.isInitializing;
  readonly hasNoApiKey = this.modelSelection.hasNoApiKey;

  readonly isTourActive = computed(() => this.onboarding.isTourActive());
  readonly isInputHiddenByTour = computed(() => this.onboarding.isTourActive() && !this.onboarding.isIntro());

  /**
   * The connect() order is load-bearing: the orchestrator is initialized before the language is applied,
   * and the effects are registered greeting -> pending welcome -> panel open -> plan refresh -> tour start,
   * so a panel opened by the tour badge greets first and presents the station after that.
   */
  constructor() {
    this.transcript.registerInputFocus(() => this.chatInput()?.nativeElement?.focus());
    afterEveryRender(() => {
      if (this.transcript.consumeScrollRequest()) {
        this.scrollToBottom();
      }
    });
    this.voiceBridge.connect();
    this.languageSync.connect();
    this.welcome.connect();
    this.session.connect();
    this.tour.connect();
  }

  get messages(): readonly ChatMessage[] {
    return this.orchestrator.messages();
  }

  get isListening(): boolean {
    return this.orchestrator.state() === ConversationState.Listening;
  }

  isHiddenProactiveMessage(message: ChatMessage): boolean {
    return this.proactiveInboxService.hiddenMessageIds().has(message.id);
  }

  isInboxMessage(message: ChatMessage): boolean {
    return this.proactiveInboxService.inboxMessageIds().has(message.id);
  }

  isUsingWhisper(): boolean {
    return this.speechService.getDiagnostics().useWhisperFallback;
  }

  sendMessage(): Promise<void> {
    return this.turnStream.sendMessage();
  }

  /** Called by the aside's clear button; starts a new conversation with a fresh welcome. */
  clearChat(): void {
    this.session.clearChat();
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

  /**
   * Typing a printable key ends a running voice session and silences speech output (barge-in by
   * keyboard); Enter without Shift sends the message.
   * @param event - Keydown event of the chat input
   */
  onInputKeyPress(event: KeyboardEvent): void {
    if (isPrintableKey(event)) {
      if (this.orchestrator.voiceModeEnabled()) {
        this.orchestrator.endSession();
      }
      this.ttsService.interrupt();
      this.orchestrator.stopAutoSpeak();
    }

    if (event.key === ENTER_KEY && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /** 'instant' overrides the container's CSS smooth scrolling: a smooth scroll lags behind streamed text and carries the stop button out of view. */
  private scrollToBottom(): void {
    const messagesContainer = this.messagesContainer();
    if (messagesContainer?.nativeElement) {
      messagesContainer.nativeElement.scrollTo({
        top: messagesContainer.nativeElement.scrollHeight,
        behavior: SCROLL_BEHAVIOR_INSTANT,
      });
    }
  }
}
