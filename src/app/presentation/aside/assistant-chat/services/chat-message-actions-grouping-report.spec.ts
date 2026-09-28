// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';

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
import { PROACTIVE_TRIGGER_KIND } from 'src/app/domain/constants/proactive-trigger-kinds.constants';
import { GROUPING_FEASIBILITY_TRIGGER_PHRASE_KEY } from 'src/app/domain/constants/grouping-feasibility.constants';

@Component({ selector: 'app-test-host', standalone: true, template: '' })
class TestHostComponent {}

/**
 * Covers the "open the report" button of the proactive grouping_feasibility notice: only that kind
 * is recognised, and the button sends the translated trigger phrase of the report recipe to the chat.
 */
describe('ChatMessageActionsService (grouping report)', () => {
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
  let orchestratorMock: { submitText: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    orchestratorMessages = signal<ChatMessage[]>([]);
    orchestratorMock = { submitText: vi.fn().mockResolvedValue(undefined) };
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
            submitText: orchestratorMock.submitText,
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

  const proactive = (kind: string): ChatMessage =>
    ({
      id: 'proactive-1',
      sender: 'assistant',
      content: 'i18n:assistant.proactive.groupingFeasibility',
      timestamp: new Date('2026-09-28T06:00:00Z'),
      messageKind: 'proactive',
      proactiveKind: kind,
    }) as ChatMessage;

  it('recognises the grouping feasibility notice', () => {
    // Arrange
    const message = proactive(PROACTIVE_TRIGGER_KIND.GroupingFeasibility);

    // Act
    const result = service.isGroupingFeasibilityNotice(message);

    // Assert
    expect(result).toBe(true);
    expect(service.isGroupingFeasibilityNotice(proactive(PROACTIVE_TRIGGER_KIND.NoScheduleYet))).toBe(false);
  });

  it('sends the translated trigger phrase of the report recipe', () => {
    // Arrange
    const message = proactive(PROACTIVE_TRIGGER_KIND.GroupingFeasibility);

    // Act
    service.openGroupingReport(message);

    // Assert
    expect(orchestratorMock.submitText).toHaveBeenCalledWith(GROUPING_FEASIBILITY_TRIGGER_PHRASE_KEY);
  });

  it('ignores messages of other kinds', () => {
    // Act
    service.openGroupingReport(proactive(PROACTIVE_TRIGGER_KIND.NoScheduleYet));

    // Assert
    expect(orchestratorMock.submitText).not.toHaveBeenCalled();
  });
});
