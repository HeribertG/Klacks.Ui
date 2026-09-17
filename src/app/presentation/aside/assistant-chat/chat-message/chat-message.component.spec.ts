// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ChatMessageComponent } from './chat-message.component';
import { ChatMessage } from '../chat-message.interface';
import { ITurnOption } from 'src/app/domain/models/assistant/turn-options.interface';
import { ChatMessageActionsService } from '../services/chat-message-actions.service';
import { ChatStageStatusService } from '../services/chat-stage-status.service';
import { ASSISTANT_STATUS_STAGE } from 'src/app/domain/constants/assistant-status-stage.constants';
import { TextToSpeechService } from '../services/text-to-speech.service';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { PROACTIVE_REACTION, PROACTIVE_REJECT_REASON } from 'src/app/domain/constants/proactive-reaction.constants';
import { ChatTurnControlService } from '../services/chat-turn-control.service';

describe('ChatMessageComponent', () => {
  let fixture: ComponentFixture<ChatMessageComponent>;
  let component: ChatMessageComponent;
  let stageStatus: ChatStageStatusService;
  let turnControlMock: { stop: ReturnType<typeof vi.fn> };
  let actionsMock: {
    correctionMenuMessageId: ReturnType<typeof signal<string | null>>;
    dismissMenuMessageId: ReturnType<typeof signal<string | null>>;
    pendingReactionMessageId: ReturnType<typeof signal<string | null>>;
    pendingMuteMessageId: ReturnType<typeof signal<string | null>>;
    pendingDelegateMessageId: ReturnType<typeof signal<string | null>>;
    pendingAcknowledgeMessageId: ReturnType<typeof signal<string | null>>;
    isMuteSuggestion: ReturnType<typeof vi.fn>;
    isSetupNotice: ReturnType<typeof vi.fn>;
    startSetupConsultation: ReturnType<typeof vi.fn>;
    toggleDismissMenu: ReturnType<typeof vi.fn>;
    dismissProactiveMessage: ReturnType<typeof vi.fn>;
    onProactiveActionClick: ReturnType<typeof vi.fn>;
    submitMuteSuggestion: ReturnType<typeof vi.fn>;
    submitDelegate: ReturnType<typeof vi.fn>;
    speakMessage: ReturnType<typeof vi.fn>;
    onNotHelpfulClick: ReturnType<typeof vi.fn>;
    submitNotHelpfulComment: ReturnType<typeof vi.fn>;
    submitHelpfulFeedback: ReturnType<typeof vi.fn>;
    submitCorrection: ReturnType<typeof vi.fn>;
    expectedSkillMessageId: ReturnType<typeof signal<string | null>>;
    turnOptions: ReturnType<typeof signal<readonly ITurnOption[]>>;
    turnOptionsLoading: ReturnType<typeof signal<boolean>>;
    openExpectedSkillMenu: ReturnType<typeof vi.fn>;
    submitExpectedSkillFreeText: ReturnType<typeof vi.fn>;
    submitProactiveReaction: ReturnType<typeof vi.fn>;
    submitAcknowledge: ReturnType<typeof vi.fn>;
  };

  const baseUserMessage: ChatMessage = {
    id: 'msg-user-1',
    sender: 'user',
    content: 'Hallo Klacksy',
    formattedContent: 'Hallo Klacksy',
    timestamp: new Date('2026-09-06T08:00:00Z'),
  };

  const baseAssistantMessage: ChatMessage = {
    id: 'msg-assistant-1',
    sender: 'assistant',
    content: 'Hier ist deine Antwort.',
    formattedContent: 'Hier ist deine Antwort.',
    timestamp: new Date('2026-09-06T08:00:05Z'),
  };

  const proactiveMessage: ChatMessage = {
    id: 'msg-proactive-1',
    sender: 'assistant',
    content: 'Eine Schicht ist unbesetzt.',
    formattedContent: 'Eine Schicht ist unbesetzt.',
    timestamp: new Date('2026-09-06T08:00:10Z'),
    messageKind: 'proactive',
    proactiveActionRoute: '/workplace/schedule',
  };

  beforeEach(async () => {
    turnControlMock = { stop: vi.fn(() => Promise.resolve()) };
    actionsMock = {
      correctionMenuMessageId: signal<string | null>(null),
      dismissMenuMessageId: signal<string | null>(null),
      pendingReactionMessageId: signal<string | null>(null),
      pendingMuteMessageId: signal<string | null>(null),
      pendingDelegateMessageId: signal<string | null>(null),
      pendingAcknowledgeMessageId: signal<string | null>(null),
      isMuteSuggestion: vi.fn().mockReturnValue(false),
      isSetupNotice: vi.fn().mockReturnValue(false),
      startSetupConsultation: vi.fn(),
      toggleDismissMenu: vi.fn(),
      dismissProactiveMessage: vi.fn(),
      onProactiveActionClick: vi.fn(),
      submitMuteSuggestion: vi.fn(),
      submitDelegate: vi.fn(),
      speakMessage: vi.fn(),
      onNotHelpfulClick: vi.fn(),
      submitNotHelpfulComment: vi.fn(),
      submitHelpfulFeedback: vi.fn(),
      submitCorrection: vi.fn(),
      expectedSkillMessageId: signal<string | null>(null),
      turnOptions: signal<readonly ITurnOption[]>([]),
      turnOptionsLoading: signal(false),
      openExpectedSkillMenu: vi.fn(),
      submitExpectedSkillFreeText: vi.fn(),
      submitProactiveReaction: vi.fn(),
      submitAcknowledge: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ChatMessageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ChatMessageActionsService, useValue: actionsMock },
        {
          provide: TextToSpeechService,
          useValue: {
            isPlaying: signal(false),
            isLoading: signal(false),
            playingMessageId: signal<string | null>(null),
          },
        },
        { provide: DataLoadFileService, useValue: { logoImage$: signal<string | null>(null) } },
        {
          provide: DataManagementAssistantService,
          useValue: {
            modelsInitialized: signal(true),
            availableModels: signal([]),
            selectedModelId: signal(''),
          },
        },
        {
          provide: DataManagementAssistantProviderService,
          useValue: {
            providersInitialized: signal(true),
            getCurrentProviders: vi.fn().mockReturnValue([{ providerId: 'openai', hasApiKey: true }]),
          },
        },
        { provide: OnboardingService, useValue: { isTourActive: signal(false) } },
        { provide: ChatTurnControlService, useValue: turnControlMock },
      ],
    }).compileComponents();

    const translateService = TestBed.inject(TranslateService);
    vi.spyOn(translateService, 'instant').mockImplementation((key) => key as string);

    fixture = TestBed.createComponent(ChatMessageComponent);
    component = fixture.componentInstance;
    stageStatus = TestBed.inject(ChatStageStatusService);
  });

  it('renders a user message bubble on the right with its text', () => {
    fixture.componentRef.setInput('message', baseUserMessage);
    fixture.detectChanges();

    const wrapper: HTMLElement = fixture.nativeElement.querySelector('.message-wrapper');
    expect(wrapper.classList.contains('user')).toBe(true);
    expect(fixture.nativeElement.querySelector('.message-text').textContent).toContain('Hallo Klacksy');
    expect(component.message()).toBe(baseUserMessage);
  });

  it('renders an assistant message bubble with a TTS button', () => {
    fixture.componentRef.setInput('message', baseAssistantMessage);
    fixture.detectChanges();

    const wrapper: HTMLElement = fixture.nativeElement.querySelector('.message-wrapper');
    expect(wrapper.classList.contains('assistant')).toBe(true);
    expect(fixture.nativeElement.querySelector('.message-text').textContent).toContain('Hier ist deine Antwort.');
    expect(fixture.nativeElement.querySelector('.tts-button')).toBeTruthy();
  });

  it('renders the proactive reaction block for a proactive message', () => {
    fixture.componentRef.setInput('message', proactiveMessage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.proactive-reactions')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.proactive-action-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.system-notice-badge')).toBeTruthy();
  });

  it('does not render the action button when the message has no action route', () => {
    const withoutAction: ChatMessage = { ...proactiveMessage, proactiveActionRoute: undefined };
    fixture.componentRef.setInput('message', withoutAction);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.proactive-action-btn')).toBeNull();
  });

  it('renders the urgent badge only for high severity', () => {
    fixture.componentRef.setInput('message', { ...proactiveMessage, proactiveSeverity: 'high' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.system-notice-badge.severity-high')).toBeTruthy();

    fixture.componentRef.setInput('message', { ...proactiveMessage, proactiveSeverity: 'medium' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.system-notice-badge.severity-high')).toBeNull();
  });

  // This message classifies as a mute suggestion via actionsMock.isMuteSuggestion, not through its
  // own proactiveKind field - the mock stands in for ChatMessageActionsService.isMuteSuggestion().
  it('renders the mute button instead of the helpful reaction for a mute-suggestion message', () => {
    actionsMock.isMuteSuggestion.mockReturnValue(true);
    const muteMessage: ChatMessage = { ...proactiveMessage, proactiveActionRoute: undefined };
    fixture.componentRef.setInput('message', muteMessage);
    fixture.detectChanges();

    const muteButton: HTMLButtonElement = fixture.nativeElement.querySelector('.proactive-mute-btn');
    expect(muteButton).toBeTruthy();
    muteButton.click();
    expect(actionsMock.submitMuteSuggestion).toHaveBeenCalledWith(muteMessage);
  });

  it('renders the delegate button only when the message can be delegated', () => {
    const delegable: ChatMessage = { ...proactiveMessage, proactiveActionRoute: undefined, proactiveCanDelegate: true };
    fixture.componentRef.setInput('message', delegable);
    fixture.detectChanges();

    const delegateButton: HTMLButtonElement = fixture.nativeElement.querySelector('.proactive-delegate-btn');
    expect(delegateButton).toBeTruthy();
    delegateButton.click();
    expect(actionsMock.submitDelegate).toHaveBeenCalledWith(delegable);

    fixture.componentRef.setInput('message', { ...delegable, proactiveCanDelegate: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.proactive-delegate-btn')).toBeNull();
  });

  it('renders the acknowledge button until the message is acknowledged', () => {
    const unacknowledged: ChatMessage = { ...proactiveMessage, proactiveActionRoute: undefined };
    fixture.componentRef.setInput('message', unacknowledged);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.proactive-acknowledge-btn')).toBeTruthy();

    fixture.componentRef.setInput('message', { ...unacknowledged, proactiveAcknowledged: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.proactive-acknowledge-btn')).toBeNull();
  });

  it('opens the dismiss-reason menu with all four reasons and forwards the picked one', () => {
    const dismissible: ChatMessage = { ...proactiveMessage, proactiveActionRoute: undefined };
    fixture.componentRef.setInput('message', dismissible);
    fixture.detectChanges();

    const dismissToggle: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.proactive-reaction-btn')[
      fixture.nativeElement.querySelectorAll('.proactive-reaction-btn').length - 1
    ];
    dismissToggle.click();
    expect(actionsMock.toggleDismissMenu).toHaveBeenCalledWith(dismissible.id);

    // The mock does not flip its own signal on toggleDismissMenu(), so the menu is driven directly.
    actionsMock.dismissMenuMessageId.set(dismissible.id);
    fixture.detectChanges();

    const menuItems: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.proactive-dismiss-menu [role="menuitem"]'),
    );
    expect(menuItems.length).toBe(4);

    menuItems[menuItems.length - 1].click();
    expect(actionsMock.dismissProactiveMessage).toHaveBeenCalledWith(dismissible, PROACTIVE_REJECT_REASON.NoReason);
  });

  it('marks a proactive reaction as helpful through the shared actions service', () => {
    const helpfulProactive: ChatMessage = { ...proactiveMessage, proactiveActionRoute: undefined };
    fixture.componentRef.setInput('message', helpfulProactive);
    fixture.detectChanges();

    const helpfulButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.proactive-reaction-btn:not(.proactive-mute-btn):not(.proactive-acknowledge-btn)',
    );
    helpfulButton.click();

    expect(actionsMock.submitProactiveReaction).toHaveBeenCalledWith(helpfulProactive, PROACTIVE_REACTION.Helpful);
  });

  it('delegates the thumbs-up click on an assistant message to the actions service', () => {
    const respondedMessage: ChatMessage = { ...baseAssistantMessage, respondedToUserMessage: 'Wie spät ist es?' };
    fixture.componentRef.setInput('message', respondedMessage);
    fixture.detectChanges();

    const helpfulButton: HTMLButtonElement = fixture.nativeElement.querySelector('.feedback-btn');
    helpfulButton.click();

    expect(actionsMock.submitHelpfulFeedback).toHaveBeenCalledWith(respondedMessage);
  });

  describe('working status row', () => {
    const emptyStreamingMessage: ChatMessage = {
      id: 'msg-streaming-1',
      sender: 'assistant',
      content: '',
      formattedContent: '',
      timestamp: new Date('2026-09-12T08:00:00Z'),
      isStreaming: true,
    };

    it('shows the stage text and dots instead of an empty dated bubble while streaming with no content', () => {
      stageStatus.startMessage(emptyStreamingMessage.id);
      stageStatus.applyStatus(ASSISTANT_STATUS_STAGE.CallingModel);
      fixture.componentRef.setInput('message', emptyStreamingMessage);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.message-text')).toBeNull();
      expect(fixture.nativeElement.querySelector('.message-time')).toBeNull();
      expect(fixture.nativeElement.querySelector('.stage-status-text').textContent).toContain(
        'assistant-chat.stage.calling_model',
      );
      expect(fixture.nativeElement.querySelector('.typing-indicator')).toBeTruthy();
    });

    it('falls back to the generic working label before the first status event arrives', () => {
      stageStatus.startMessage(emptyStreamingMessage.id);
      fixture.componentRef.setInput('message', emptyStreamingMessage);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.stage-status-text').textContent).toContain(
        'assistant-chat.tool-status.working',
      );
    });

    it('renders normal text and the timestamp once content has arrived, even while still streaming', () => {
      const streamingWithContent: ChatMessage = {
        ...emptyStreamingMessage,
        content: 'Teilantwort…',
        formattedContent: 'Teilantwort…',
      };
      stageStatus.startMessage(emptyStreamingMessage.id);
      stageStatus.applyStatus(ASSISTANT_STATUS_STAGE.CallingModel);
      fixture.componentRef.setInput('message', streamingWithContent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.message-text').textContent).toContain('Teilantwort…');
      expect(fixture.nativeElement.querySelector('.message-time')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.stage-status')).toBeNull();
    });

    it('shows tool steps alongside already-streamed text for a later multi-turn tool call', () => {
      const streamingWithContent: ChatMessage = {
        ...emptyStreamingMessage,
        content: 'Teilantwort…',
        formattedContent: 'Teilantwort…',
      };
      stageStatus.startMessage(emptyStreamingMessage.id);
      stageStatus.addToolStep('search_address');
      fixture.componentRef.setInput('message', streamingWithContent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.message-text').textContent).toContain('Teilantwort…');
      expect(fixture.nativeElement.querySelector('.tool-status')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.stage-status-text')).toBeNull();
      expect(fixture.nativeElement.querySelector('.typing-indicator')).toBeNull();
    });

    it('falls back to the plain empty bubble for a message the stage service is not tracking', () => {
      stageStatus.startMessage('some-other-message-id');
      fixture.componentRef.setInput('message', emptyStreamingMessage);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.stage-status')).toBeNull();
      expect(fixture.nativeElement.querySelector('.message-text')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.message-time')).toBeTruthy();
    });
  });

  it('opens the expected-skill menu instead of submitting straight away on "wrong skill"', () => {
    // Arrange
    const message: ChatMessage = { ...baseAssistantMessage, respondedToUserMessage: 'Lege einen Kunden an' };
    actionsMock.correctionMenuMessageId.set(message.id);
    fixture.componentRef.setInput('message', message);
    fixture.detectChanges();

    // Act
    const wrongSkillButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('.correction-menu button[role="menuitem"]');
    wrongSkillButton.click();

    // Assert
    expect(actionsMock.openExpectedSkillMenu).toHaveBeenCalledWith(message);
    expect(actionsMock.submitCorrection).not.toHaveBeenCalled();
  });

  it('renders one option button per turn option and sends it as the expected skill', () => {
    // Arrange
    const message: ChatMessage = { ...baseAssistantMessage, respondedToUserMessage: 'Lege einen Kunden an' };
    actionsMock.correctionMenuMessageId.set(message.id);
    actionsMock.expectedSkillMessageId.set(message.id);
    actionsMock.turnOptions.set([
      { skillName: 'create_client', displayName: 'Create client', description: 'Creates a client.' },
      { skillName: 'list_clients', displayName: 'List clients', description: 'Lists clients.' },
    ]);
    fixture.componentRef.setInput('message', message);
    fixture.detectChanges();

    // Act
    const options: HTMLButtonElement[] =
      Array.from(fixture.nativeElement.querySelectorAll('.expected-skill-option'));
    options[1].click();

    // Assert
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain('Create client');
    expect(actionsMock.submitCorrection).toHaveBeenCalledWith(message, 'wrong_skill', 'list_clients');
  });

  it('keeps the free-text fallback and the unknown entry when no option was loaded', () => {
    // Arrange
    const message: ChatMessage = { ...baseAssistantMessage, respondedToUserMessage: 'Lege einen Kunden an' };
    actionsMock.correctionMenuMessageId.set(message.id);
    actionsMock.expectedSkillMessageId.set(message.id);
    actionsMock.turnOptions.set([]);
    fixture.componentRef.setInput('message', message);
    fixture.detectChanges();

    // Act
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.expected-skill-free-text input');
    input.value = 'create_client';
    const send: HTMLButtonElement =
      fixture.nativeElement.querySelector('.expected-skill-free-text .correction-comment-send');
    send.click();
    const unknown: HTMLButtonElement = fixture.nativeElement.querySelector('.expected-skill-unknown');
    unknown.click();

    // Assert
    expect(fixture.nativeElement.querySelectorAll('.expected-skill-option').length).toBe(0);
    expect(actionsMock.submitExpectedSkillFreeText).toHaveBeenCalledWith(message, 'create_client');
    expect(actionsMock.submitCorrection).toHaveBeenCalledWith(message, 'wrong_skill');
  });

  it('caps the free-text skill box at the shared maximum length', () => {
    // Arrange
    const message: ChatMessage = { ...baseAssistantMessage, respondedToUserMessage: 'Lege einen Kunden an' };
    actionsMock.correctionMenuMessageId.set(message.id);
    actionsMock.expectedSkillMessageId.set(message.id);
    fixture.componentRef.setInput('message', message);

    // Act
    fixture.detectChanges();

    // Assert
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.expected-skill-free-text input');
    expect(input.getAttribute('maxlength')).toBe('128');
  });

  it('reports the expected-skill panel state through aria-expanded on the wrong-skill entry', () => {
    // Arrange
    const message: ChatMessage = { ...baseAssistantMessage, respondedToUserMessage: 'Lege einen Kunden an' };
    actionsMock.correctionMenuMessageId.set(message.id);
    fixture.componentRef.setInput('message', message);
    fixture.detectChanges();
    const wrongSkillButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('.correction-menu button[role="menuitem"]');

    // Act
    const collapsed = wrongSkillButton.getAttribute('aria-expanded');
    actionsMock.expectedSkillMessageId.set(message.id);
    fixture.detectChanges();

    // Assert
    expect(collapsed).toBe('false');
    expect(wrongSkillButton.getAttribute('aria-expanded')).toBe('true');
  });

  describe('stop button and interrupted notice', () => {
    it('shows the stop button while the assistant message is streaming', () => {
      fixture.componentRef.setInput('message', { ...baseAssistantMessage, isStreaming: true });
      fixture.detectChanges();

      const stopButton = fixture.nativeElement.querySelector('.stop-turn-button');
      expect(stopButton).toBeTruthy();
    });

    it('calls turnControl.stop with user-button when the stop button is clicked', () => {
      fixture.componentRef.setInput('message', { ...baseAssistantMessage, isStreaming: true });
      fixture.detectChanges();

      const stopButton: HTMLButtonElement = fixture.nativeElement.querySelector('.stop-turn-button');
      stopButton.click();

      expect(turnControlMock.stop).toHaveBeenCalledWith('user-button');
    });

    it('hides the stop button once streaming has finished', () => {
      fixture.componentRef.setInput('message', { ...baseAssistantMessage, isStreaming: false });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.stop-turn-button')).toBeNull();
    });

    it('shows the interrupted notice with the executed list', () => {
      fixture.componentRef.setInput('message', {
        ...baseAssistantMessage,
        isStreaming: false,
        wasInterrupted: true,
        interruptedSummary: { executed: ['create_client'] },
      });
      fixture.detectChanges();

      const notice: HTMLElement = fixture.nativeElement.querySelector('.interrupted-notice');
      expect(notice).toBeTruthy();
      expect(notice.textContent).toContain('create_client');
    });

    it('shows the nothing-executed notice when the executed list is empty', () => {
      fixture.componentRef.setInput('message', {
        ...baseAssistantMessage,
        isStreaming: false,
        wasInterrupted: true,
        interruptedSummary: { executed: [] },
      });
      fixture.detectChanges();

      const notice: HTMLElement = fixture.nativeElement.querySelector('.interrupted-notice');
      expect(notice).toBeTruthy();
      expect(notice.textContent).toContain('assistant-chat.stop.nothing-executed');
    });

    // wasInterrupted:true with interruptedSummary left undefined never happens in practice today -
    // ChatTurnControlService always sets both together - but the type allows it, and nothing
    // enforces the pairing across files. This proves the template guards it instead of assuming it.
    it('renders without throwing when wasInterrupted is set but interruptedSummary is undefined', () => {
      fixture.componentRef.setInput('message', {
        ...baseAssistantMessage,
        isStreaming: false,
        wasInterrupted: true,
        interruptedSummary: undefined,
      });

      expect(() => fixture.detectChanges()).not.toThrow();
      const notice: HTMLElement = fixture.nativeElement.querySelector('.interrupted-notice');
      expect(notice).toBeTruthy();
      expect(notice.textContent).toContain('assistant-chat.stop.nothing-executed');
    });

    it('shows the cautious sentence when interruptedSummary is null', () => {
      fixture.componentRef.setInput('message', {
        ...baseAssistantMessage,
        isStreaming: false,
        wasInterrupted: true,
        interruptedSummary: null,
      });
      fixture.detectChanges();

      const notice: HTMLElement = fixture.nativeElement.querySelector('.interrupted-notice');
      expect(notice).toBeTruthy();
      expect(notice.textContent).toContain('assistant-chat.stop.maybe-executed');
    });

    it('does not show the interrupted notice when wasInterrupted is not set', () => {
      fixture.componentRef.setInput('message', baseAssistantMessage);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.interrupted-notice')).toBeNull();
    });
  });
});
