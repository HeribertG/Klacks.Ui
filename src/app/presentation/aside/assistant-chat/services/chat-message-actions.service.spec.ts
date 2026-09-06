// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { IProactiveInboxItem } from 'src/app/domain/interfaces/proactive-inbox.interface';
import { ChatMessage } from '../chat-message.interface';

/**
 * An otherwise-empty standalone host. Its only job is to give the service's constructor-installed
 * effect() a real change-detection cycle to run in via fixture.detectChanges() - the same
 * mechanism every other spec in this project already relies on - rather than a bare
 * TestBed.inject() with no fixture at all, which does not host anything the effect the service
 * touches (NgZone.run() inside the load subscription) expects.
 */
@Component({ selector: 'app-test-host', standalone: true, template: '' })
class TestHostComponent {}

/**
 * Covers the "while you were away" load pipeline that lives on this root-scoped service, not on
 * any one component. It is the single trigger for both the chat and the overlay-rail inbox card
 * (F5 regression, 2026-09-06): the card only renders once inboxMessages() is non-empty, and
 * before this pipeline moved here, the load was owned by AssistantChatComponent's constructor -
 * so on a cold start where nothing had mounted the chat, nobody ever triggered the first load and
 * the card could never appear. These tests never create AssistantChatComponent or
 * AudioModePanelsComponent, only this unrelated empty host, to prove the load fires independent
 * of either one mounting.
 */
describe('ChatMessageActionsService (proactive inbox load pipeline)', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let service: ChatMessageActionsService;
  let asideService: AsideService;
  let proactiveInboxServiceMock: {
    loadUnreadMessages: ReturnType<typeof vi.fn>;
    markManyRead: ReturnType<typeof vi.fn>;
    refreshUnreadCount: ReturnType<typeof vi.fn>;
    inboxExpanded: ReturnType<typeof signal<boolean>>;
    inboxMessageIds: ReturnType<typeof signal<ReadonlySet<string>>>;
    hiddenMessageIds: ReturnType<typeof signal<ReadonlySet<string>>>;
    setInboxHeadingIfUnset: ReturnType<typeof vi.fn>;
    addToInboxBlock: ReturnType<typeof vi.fn>;
    markHidden: ReturnType<typeof vi.fn>;
    unhideMessages: ReturnType<typeof vi.fn>;
  };
  let orchestratorMessagesSignal: ReturnType<typeof signal<ChatMessage[]>>;

  const inboxItem = (overrides: Partial<IProactiveInboxItem> = {}): IProactiveInboxItem => ({
    id: 'inbox-1',
    content: 'Eine Schicht ist unbesetzt.',
    contentParams: {},
    severity: 'medium',
    reaction: null,
    createdUtc: '2026-09-06T06:00:00Z',
    readAtUtc: null,
    ...overrides,
  });

  beforeEach(async () => {
    orchestratorMessagesSignal = signal<ChatMessage[]>([]);
    proactiveInboxServiceMock = {
      loadUnreadMessages: vi.fn().mockReturnValue(of([])),
      markManyRead: vi.fn().mockReturnValue(of(void 0)),
      refreshUnreadCount: vi.fn(),
      inboxExpanded: signal(true),
      inboxMessageIds: signal<ReadonlySet<string>>(new Set()),
      hiddenMessageIds: signal<ReadonlySet<string>>(new Set()),
      setInboxHeadingIfUnset: vi.fn(),
      addToInboxBlock: vi.fn((ids: readonly string[]) =>
        proactiveInboxServiceMock.inboxMessageIds.set(new Set([...proactiveInboxServiceMock.inboxMessageIds(), ...ids])),
      ),
      markHidden: vi.fn(),
      unhideMessages: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementProactiveInboxService, useValue: proactiveInboxServiceMock },
        {
          provide: ConversationOrchestratorService,
          useValue: {
            state: signal(ConversationState.Idle),
            messages: orchestratorMessagesSignal,
            addMessage: vi.fn((msg: ChatMessage) => orchestratorMessagesSignal.update((c) => [...c, msg])),
            replaceMessages: vi.fn((next: readonly ChatMessage[]) => orchestratorMessagesSignal.set([...next])),
            updateMessage: vi.fn((id: string, patch: Partial<ChatMessage>) =>
              orchestratorMessagesSignal.update((current) => {
                const idx = current.findIndex((m) => m.id === id);
                if (idx < 0) return current;
                const out = current.slice();
                out[idx] = { ...out[idx], ...patch };
                return out;
              }),
            ),
            stopAutoSpeak: vi.fn(),
          },
        },
        {
          provide: DataManagementAssistantService,
          useValue: {
            muteTriggerKind: vi.fn(),
            delegateCondition: vi.fn(),
            setProactiveReaction: vi.fn(),
            submitHelpfulFeedback: vi.fn(),
            submitCorrection: vi.fn(),
          },
        },
        { provide: LanguageMappingService, useValue: { getSpeechLocale: vi.fn(), currentLang: 'de' } },
        { provide: KlacksyNavigationService, useValue: { navigateAndScroll: vi.fn() } },
        { provide: ToastShowService, useValue: { showInfo: vi.fn(), showError: vi.fn() } },
        { provide: TextToSpeechService, useValue: { speak: vi.fn() } },
        {
          // The real service drives an actual SignalR connection helper (timers, retries) that
          // has nothing to do with what these tests cover and only adds noise/instability here.
          provide: AssistantSignalRService,
          useValue: {
            proactiveMessage$: new Subject(),
            proactiveInboxChanged$: new Subject(),
          },
        },
      ],
    }).compileComponents();

    asideService = TestBed.inject(AsideService);
    hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.detectChanges();
  });

  afterEach(() => {
    asideService.hide();
    hostFixture.detectChanges();
  });

  it('loads the inbox the moment the aside becomes visible, with nothing else ever mounted (F5 regression)', () => {
    // Arrange - the service itself is injected (as it would be by the root injector on first
    // use), nothing resembling AssistantChatComponent or AudioModePanelsComponent is created -
    // only the empty host above, which never touches the inbox at all.
    service = TestBed.inject(ChatMessageActionsService);
    expect(proactiveInboxServiceMock.loadUnreadMessages).not.toHaveBeenCalled();

    // Act - simulate the assistant panel opening after a cold start.
    asideService.show();
    hostFixture.detectChanges();

    // Assert
    expect(proactiveInboxServiceMock.loadUnreadMessages).toHaveBeenCalledTimes(1);
  });

  it('materializes loaded items into the shared inboxMessages() list without any component reading it first', () => {
    proactiveInboxServiceMock.loadUnreadMessages.mockReturnValue(of([inboxItem()]));
    service = TestBed.inject(ChatMessageActionsService);

    asideService.show();
    hostFixture.detectChanges();

    expect(service.inboxMessages().map((m) => m.id)).toEqual(['inbox-1']);
  });

  it('does not load a second time while the aside stays open (single trigger, no duplicate call)', () => {
    service = TestBed.inject(ChatMessageActionsService);
    asideService.show();
    hostFixture.detectChanges();
    expect(proactiveInboxServiceMock.loadUnreadMessages).toHaveBeenCalledTimes(1);

    // Act - anything else that might read/re-evaluate the service must not trigger another load.
    void service.inboxMessages();
    hostFixture.detectChanges();

    // Assert
    expect(proactiveInboxServiceMock.loadUnreadMessages).toHaveBeenCalledTimes(1);
  });

  it('reloads after the aside closes and reopens', () => {
    service = TestBed.inject(ChatMessageActionsService);
    asideService.show();
    hostFixture.detectChanges();
    expect(proactiveInboxServiceMock.loadUnreadMessages).toHaveBeenCalledTimes(1);

    // Act
    asideService.hide();
    hostFixture.detectChanges();
    asideService.show();
    hostFixture.detectChanges();

    // Assert
    expect(proactiveInboxServiceMock.loadUnreadMessages).toHaveBeenCalledTimes(2);
  });

  // Two consumers (the chat and the card) both read service.inboxMessages(), which must not by
  // itself cause a second HTTP call - the effect is the only thing that triggers loadUnreadMessages.
  it('serves the same list to two independent readers without loading twice', () => {
    proactiveInboxServiceMock.loadUnreadMessages.mockReturnValue(of([inboxItem({ id: 'shared-1' })]));
    service = TestBed.inject(ChatMessageActionsService);
    asideService.show();
    hostFixture.detectChanges();

    const readByChat = service.inboxMessages().map((m) => m.id);
    const readByCard = service.inboxMessages().map((m) => m.id);

    expect(readByChat).toEqual(['shared-1']);
    expect(readByCard).toEqual(['shared-1']);
    expect(proactiveInboxServiceMock.loadUnreadMessages).toHaveBeenCalledTimes(1);
  });
});
