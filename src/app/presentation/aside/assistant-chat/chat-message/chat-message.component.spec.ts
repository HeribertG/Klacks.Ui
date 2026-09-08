// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ChatMessageComponent } from './chat-message.component';
import { ChatMessage } from '../chat-message.interface';
import { ChatMessageActionsService } from '../services/chat-message-actions.service';
import { TextToSpeechService } from '../services/text-to-speech.service';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { PROACTIVE_REACTION, PROACTIVE_REJECT_REASON } from 'src/app/domain/constants/proactive-reaction.constants';

describe('ChatMessageComponent', () => {
  let fixture: ComponentFixture<ChatMessageComponent>;
  let component: ChatMessageComponent;
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
      ],
    }).compileComponents();

    const translateService = TestBed.inject(TranslateService);
    vi.spyOn(translateService, 'instant').mockImplementation((key) => key as string);

    fixture = TestBed.createComponent(ChatMessageComponent);
    component = fixture.componentInstance;
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
});
