// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError, Subject } from 'rxjs';

import { ChatMessageActionsService } from './chat-message-actions.service';
import { ConversationOrchestratorService, ConversationState } from './conversation-orchestrator.service';
import { DataManagementProactiveInboxService } from 'src/app/domain/services/assistant/data-management-proactive-inbox.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TextToSpeechService } from './text-to-speech.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { ChatMessage } from '../chat-message.interface';
import { ITurnOption } from 'src/app/domain/models/assistant/turn-options.interface';

@Component({ selector: 'app-test-host', standalone: true, template: '' })
class TestHostComponent {}

/**
 * Covers the expected-skill half of the correction menu (C2): opening it loads the turn's toolset,
 * choosing an option sends it as expectedSkill on the correction, free text is trimmed and an empty
 * box sends nothing, and a failed load still leaves the menu usable through the free-text fallback.
 */
describe('ChatMessageActionsService (expected skill)', () => {
  let service: ChatMessageActionsService;
  let assistantServiceMock: {
    getTurnOptions: ReturnType<typeof vi.fn>;
    submitCorrection: ReturnType<typeof vi.fn>;
    submitHelpfulFeedback: ReturnType<typeof vi.fn>;
    setProactiveReaction: ReturnType<typeof vi.fn>;
    muteTriggerKind: ReturnType<typeof vi.fn>;
    delegateCondition: ReturnType<typeof vi.fn>;
  };
  let orchestratorMessages: ReturnType<typeof signal<ChatMessage[]>>;

  const assistantMessage: ChatMessage = {
    id: 'msg-assistant-1',
    sender: 'assistant',
    content: 'Ich habe die Kundenliste geöffnet.',
    timestamp: new Date('2026-09-13T08:00:00Z'),
    respondedToUserMessage: 'Lege einen neuen Kunden an',
  };

  beforeEach(async () => {
    orchestratorMessages = signal<ChatMessage[]>([assistantMessage]);
    assistantServiceMock = {
      getTurnOptions: vi.fn().mockReturnValue(of([])),
      submitCorrection: vi.fn().mockReturnValue(of({ found: true, trajectoryId: 'traj-1' })),
      submitHelpfulFeedback: vi.fn().mockReturnValue(of({ found: true, trajectoryId: 'traj-1' })),
      setProactiveReaction: vi.fn(),
      muteTriggerKind: vi.fn(),
      delegateCondition: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementProactiveInboxService,
          useValue: {
            loadUnreadMessages: vi.fn().mockReturnValue(of([])),
            markManyRead: vi.fn().mockReturnValue(of(void 0)),
            refreshUnreadCount: vi.fn(),
            inboxExpanded: signal(true),
            inboxMessageIds: signal<ReadonlySet<string>>(new Set()),
            hiddenMessageIds: signal<ReadonlySet<string>>(new Set()),
            setInboxHeadingIfUnset: vi.fn(),
            addToInboxBlock: vi.fn(),
            markHidden: vi.fn(),
            unhideMessages: vi.fn(),
          },
        },
        {
          provide: ConversationOrchestratorService,
          useValue: {
            state: signal(ConversationState.Idle),
            messages: orchestratorMessages,
            addMessage: vi.fn(),
            replaceMessages: vi.fn(),
            updateMessage: vi.fn((id: string, patch: Partial<ChatMessage>) =>
              orchestratorMessages.update((current) =>
                current.map((message) => (message.id === id ? { ...message, ...patch } : message)),
              ),
            ),
            stopAutoSpeak: vi.fn(),
          },
        },
        { provide: DataManagementAssistantService, useValue: assistantServiceMock },
        { provide: LanguageMappingService, useValue: { getSpeechLocale: vi.fn(), currentLang: 'de' } },
        { provide: KlacksyNavigationService, useValue: { navigateAndScroll: vi.fn() } },
        { provide: ToastShowService, useValue: { showInfo: vi.fn(), showError: vi.fn() } },
        { provide: TextToSpeechService, useValue: { speak: vi.fn() } },
        {
          provide: AssistantSignalRService,
          useValue: { proactiveMessage$: new Subject(), proactiveInboxChanged$: new Subject() },
        },
      ],
    }).compileComponents();

    TestBed.createComponent(TestHostComponent).detectChanges();
    service = TestBed.inject(ChatMessageActionsService);
  });

  it('loads the turn options with the answered user message when the expected-skill menu opens', () => {
    // Arrange
    assistantServiceMock.getTurnOptions.mockReturnValue(
      of([{ skillName: 'create_client', displayName: 'Create client', description: 'Creates a client.' }]),
    );

    // Act
    service.openExpectedSkillMenu(assistantMessage);

    // Assert
    expect(assistantServiceMock.getTurnOptions).toHaveBeenCalledWith({
      userMessage: 'Lege einen neuen Kunden an',
    });
    expect(service.expectedSkillMessageId()).toBe('msg-assistant-1');
    expect(service.turnOptions().map((option) => option.skillName)).toEqual(['create_client']);
    expect(service.turnOptionsLoading()).toBe(false);
  });

  it('leaves the menu open with an empty option list when the load fails', () => {
    // Arrange
    assistantServiceMock.getTurnOptions.mockReturnValue(throwError(() => new Error('boom')));

    // Act
    service.openExpectedSkillMenu(assistantMessage);

    // Assert
    expect(service.expectedSkillMessageId()).toBe('msg-assistant-1');
    expect(service.turnOptions()).toEqual([]);
    expect(service.turnOptionsLoading()).toBe(false);
  });

  it('sends the chosen skill as expectedSkill and closes both menus', () => {
    // Act
    service.openExpectedSkillMenu(assistantMessage);
    service.submitCorrection(assistantMessage, 'wrong_skill', 'create_client');

    // Assert
    expect(assistantServiceMock.submitCorrection).toHaveBeenCalledWith({
      userMessage: 'Lege einen neuen Kunden an',
      correctionType: 'wrong_skill',
      expectedSkill: 'create_client',
    });
    expect(service.expectedSkillMessageId()).toBeNull();
    expect(service.correctionMenuMessageId()).toBeNull();
  });

  it('sends a correction without expectedSkill when the user does not name a skill', () => {
    // Act
    service.submitCorrection(assistantMessage, 'wrong_skill');

    // Assert
    expect(assistantServiceMock.submitCorrection).toHaveBeenCalledWith({
      userMessage: 'Lege einen neuen Kunden an',
      correctionType: 'wrong_skill',
      expectedSkill: undefined,
    });
  });

  it('sends the turn id of the corrected message with the correction', () => {
    // Arrange
    const stoppedMessage: ChatMessage = { ...assistantMessage, respondedToTurnId: 'turn-stopped' };

    // Act
    service.submitCorrection(stoppedMessage, 'wrong_skill', 'create_client');

    // Assert
    expect(assistantServiceMock.submitCorrection).toHaveBeenCalledWith({
      userMessage: 'Lege einen neuen Kunden an',
      correctionType: 'wrong_skill',
      expectedSkill: 'create_client',
      turnId: 'turn-stopped',
    });
  });

  it('sends no turn id for a message that never received one', () => {
    // Act
    service.submitCorrection(assistantMessage, 'wrong_skill');

    // Assert
    const request = assistantServiceMock.submitCorrection.mock.calls[0][0];
    expect(request.turnId).toBeUndefined();
  });

  it('trims free text before sending it as the expected skill', () => {
    // Act
    service.submitExpectedSkillFreeText(assistantMessage, '  create_client  ');

    // Assert
    expect(assistantServiceMock.submitCorrection).toHaveBeenCalledWith({
      userMessage: 'Lege einen neuen Kunden an',
      correctionType: 'wrong_skill',
      expectedSkill: 'create_client',
    });
  });

  it('sends nothing when the free-text box is empty', () => {
    // Act
    service.submitExpectedSkillFreeText(assistantMessage, '   ');

    // Assert
    expect(assistantServiceMock.submitCorrection).not.toHaveBeenCalled();
  });

  it('clears the loading flag when the menu closes while the option request is still open', () => {
    // Arrange - a request that never completes, the exact case that used to strand the loading label
    assistantServiceMock.getTurnOptions.mockReturnValue(new Subject<never>());
    service.openExpectedSkillMenu(assistantMessage);
    expect(service.turnOptionsLoading()).toBe(true);

    // Act
    service.submitNotHelpfulComment(assistantMessage, '   ');

    // Assert
    expect(service.turnOptionsLoading()).toBe(false);
    expect(service.expectedSkillMessageId()).toBeNull();
    expect(service.correctionMenuMessageId()).toBeNull();
  });

  it('ignores a late option response for a menu the user has already left', () => {
    // Arrange - the first request is still open when the user opens the menu of another message
    const otherMessage: ChatMessage = {
      ...assistantMessage,
      id: 'msg-assistant-2',
      respondedToUserMessage: 'Zeige mir die Kundenliste',
    };
    const firstResponse = new Subject<ITurnOption[]>();
    const secondResponse = new Subject<ITurnOption[]>();
    assistantServiceMock.getTurnOptions
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(secondResponse);

    // Act
    service.openExpectedSkillMenu(assistantMessage);
    service.openExpectedSkillMenu(otherMessage);
    firstResponse.next([
      { skillName: 'create_client', displayName: 'Create client', description: 'Creates a client.' },
    ]);

    // Assert
    expect(service.expectedSkillMessageId()).toBe('msg-assistant-2');
    expect(service.turnOptions()).toEqual([]);
    expect(service.turnOptionsLoading()).toBe(true);

    secondResponse.next([{ skillName: 'list_clients', displayName: 'List clients', description: 'Lists clients.' }]);
    firstResponse.error(new Error('late failure'));

    expect(service.turnOptions().map((option) => option.skillName)).toEqual(['list_clients']);
    expect(service.turnOptionsLoading()).toBe(false);
  });

  it('leaves no second level behind when the correction menu moves to another message', () => {
    // Arrange - the user opened the skill panel of the first message before switching
    const otherMessage: ChatMessage = {
      ...assistantMessage,
      id: 'msg-assistant-2',
      respondedToUserMessage: 'Zeige mir die Kundenliste',
    };
    assistantServiceMock.getTurnOptions.mockReturnValue(
      of([{ skillName: 'create_client', displayName: 'Create client', description: 'Creates a client.' }]),
    );
    service.onNotHelpfulClick(assistantMessage);
    service.openExpectedSkillMenu(assistantMessage);

    // Act
    service.onNotHelpfulClick(otherMessage);

    // Assert
    expect(service.correctionMenuMessageId()).toBe('msg-assistant-2');
    expect(service.expectedSkillMessageId()).toBeNull();
    expect(service.turnOptions()).toEqual([]);
    expect(service.turnOptionsLoading()).toBe(false);
  });
});
