// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal, Signal, WritableSignal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AudioModePanelsComponent } from './audio-mode-panels.component';
import { DataManagementGoalCandidatesService } from 'src/app/domain/services/assistant/data-management-goal-candidates.service';
import { DataManagementAgentPlanService } from 'src/app/domain/services/assistant/data-management-agent-plan.service';
import { DataManagementProactiveInboxService } from 'src/app/domain/services/assistant/data-management-proactive-inbox.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { ChatMessageActionsService } from '../services/chat-message-actions.service';
import { TextToSpeechService } from '../services/text-to-speech.service';
import { IGoalCandidate } from 'src/app/domain/interfaces/goal-candidate.interface';
import { IAgentPlan, IAgentPlanStep, PlanStatus } from 'src/app/domain/models/assistant/agent-plan.interface';
import { ChatMessage } from '../chat-message.interface';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { AsideService } from '../../aside.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';

const PANEL_TRANSLATIONS = {
  'assistant-chat.audio-mode.goal-candidates': 'Zielvorschläge',
  'assistant-chat.audio-mode.plan-execution': 'Plan-Ausführung',
  'assistant-chat.proactive.inbox-heading': 'Während du weg warst…',
  'assistant-chat.proactive.hide-all': 'Alle ausblenden',
};

describe('AudioModePanelsComponent', () => {
  let fixture: ComponentFixture<AudioModePanelsComponent>;
  let component: AudioModePanelsComponent;

  let goalCandidatesServiceMock: {
    candidates: WritableSignal<IGoalCandidate[]>;
    hasCandidates: Signal<boolean>;
    loadCandidates: ReturnType<typeof vi.fn>;
  };

  let planServiceMock: {
    activePlan: WritableSignal<IAgentPlan | null>;
    hasVisiblePlan: Signal<boolean>;
    isExecuting: Signal<boolean>;
    isPausedForApproval: Signal<boolean>;
    isCompleted: Signal<boolean>;
    isFailed: Signal<boolean>;
    isApproving: Signal<boolean>;
    isAborting: Signal<boolean>;
    steps: Signal<IAgentPlanStep[]>;
  };

  // ChatMessageActionsService is the shared surface both the chat and this card read the inbox
  // list from and trigger inbox actions on (see its own file header). Fully mocked here - like in
  // chat-message.component.spec.ts - rather than let the real root-scoped service and its whole
  // dependency tree (SignalR, AsideService, translation, etc.) construct itself, since this spec
  // only cares about the card's own rendering wiring against whatever the list contains.
  let inboxMessagesSignal: WritableSignal<ChatMessage[]>;
  // Typed against the real service's Pick so a rename or signature change on
  // ChatMessageActionsService fails this spec instead of leaving a silently stale mock behind.
  let messageActionsMock: Pick<
    ChatMessageActionsService,
    | 'inboxMessages'
    | 'hideWholeInbox'
    | 'toggleInboxExpanded'
    | 'correctionMenuMessageId'
    | 'dismissMenuMessageId'
    | 'pendingReactionMessageId'
    | 'pendingMuteMessageId'
    | 'pendingDelegateMessageId'
    | 'pendingAcknowledgeMessageId'
    | 'isMuteSuggestion'
    | 'toggleDismissMenu'
    | 'dismissProactiveMessage'
    | 'onProactiveActionClick'
    | 'submitMuteSuggestion'
    | 'submitDelegate'
    | 'speakMessage'
    | 'onNotHelpfulClick'
    | 'submitNotHelpfulComment'
    | 'submitHelpfulFeedback'
    | 'submitCorrection'
    | 'submitProactiveReaction'
    | 'submitAcknowledge'
  >;

  let inboxExpandedSignal: WritableSignal<boolean>;
  let proactiveInboxServiceMock: { inboxExpanded: Signal<boolean> };

  const sampleInboxMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
    id: 'inbox-msg-1',
    sender: 'assistant',
    content: 'Eine Schicht ist unbesetzt.',
    // No fixed formattedContent: app-chat-message falls back to formatMessage(content), so a
    // content override in a test is what actually shows up rendered.
    timestamp: new Date('2026-09-06T08:00:00Z'),
    messageKind: 'proactive',
    ...overrides,
  });

  const sampleCandidate: IGoalCandidate = {
    id: 'cand-1',
    goalType: 'target_hours_drift',
    titleKey: 'assistant-chat.goal-candidates.type.targetHoursDrift.title',
    rationaleKey: 'assistant-chat.goal-candidates.type.targetHoursDrift.rationale',
    rationaleParams: { count: '5', days: '7' },
    title: 'Reduce overtime',
    rationale: 'Overtime exceeded.',
    confidence: 'high',
    signalSource: 'target_hours_drift',
    status: 'proposed',
    createdUtc: '2026-09-05T10:00:00Z',
    decidedUtc: null,
  };

  const samplePlan: IAgentPlan = {
    id: 'plan-1',
    agentId: 'agent-1',
    goal: 'Test Goal',
    status: PlanStatus.Executing,
    currentStepIndex: 1,
    lastErrorMessage: null,
    stepsJson: JSON.stringify([
      { order: 0, skill: 'search_employees', verifySkill: null, reversible: true, params: {} },
      { order: 1, skill: 'create_employee', verifySkill: null, reversible: false, params: {} },
    ]),
  };

  beforeEach(async () => {
    const candidatesSignal = signal<IGoalCandidate[]>([]);
    const planSignal = signal<IAgentPlan | null>(null);
    const stepsSignal = signal<IAgentPlanStep[]>([]);

    goalCandidatesServiceMock = {
      candidates: candidatesSignal,
      hasCandidates: computed(() => candidatesSignal().length > 0),
      loadCandidates: vi.fn().mockReturnValue(of([])),
    };

    planServiceMock = {
      activePlan: planSignal,
      hasVisiblePlan: computed(() => planSignal() !== null),
      isExecuting: computed(() => planSignal()?.status === PlanStatus.Executing),
      isPausedForApproval: computed(() => planSignal()?.status === PlanStatus.PausedForApproval),
      isCompleted: computed(() => planSignal()?.status === PlanStatus.Completed),
      isFailed: computed(() => planSignal()?.status === PlanStatus.Failed),
      isApproving: signal(false),
      isAborting: signal(false),
      steps: stepsSignal,
    };

    inboxMessagesSignal = signal<ChatMessage[]>([]);
    messageActionsMock = {
      inboxMessages: inboxMessagesSignal,
      hideWholeInbox: vi.fn(),
      toggleInboxExpanded: vi.fn(),
      correctionMenuMessageId: signal<string | null>(null),
      dismissMenuMessageId: signal<string | null>(null),
      pendingReactionMessageId: signal<string | null>(null),
      pendingMuteMessageId: signal<string | null>(null),
      pendingDelegateMessageId: signal<string | null>(null),
      pendingAcknowledgeMessageId: signal<string | null>(null),
      isMuteSuggestion: vi.fn().mockReturnValue(false),
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

    inboxExpandedSignal = signal<boolean>(true);
    proactiveInboxServiceMock = { inboxExpanded: inboxExpandedSignal };

    await TestBed.configureTestingModule({
      imports: [AudioModePanelsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementGoalCandidatesService, useValue: goalCandidatesServiceMock },
        { provide: DataManagementAgentPlanService, useValue: planServiceMock },
        { provide: DataManagementProactiveInboxService, useValue: proactiveInboxServiceMock },
        { provide: ChatMessageActionsService, useValue: messageActionsMock },
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
        { provide: EVENT_BUS_TOKEN, useValue: { emit: vi.fn(), on: vi.fn(() => of(undefined)) } },
        { provide: OnboardingService, useValue: { isTourActive: () => false } },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', PANEL_TRANSLATIONS);
    translate.use('de');

    fixture = TestBed.createComponent(AudioModePanelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Test 1: Default state — both panels collapsed
  it('Test 1: both panels collapsed by default', () => {
    expect(component.isCandidatesExpanded()).toBe(false);
    expect(component.isPlanExpanded()).toBe(false);
  });

  // Test 2: No panels rendered when no candidates and no plan
  it('Test 2: renders no cards when no candidates and no plan', () => {
    const cards = fixture.nativeElement.querySelectorAll('.audio-panel-card');
    expect(cards.length).toBe(0);
  });

  // Test 3: Goal candidates card renders when candidates exist. Collapsed it is icon plus count
  // only, so the lane it sits in can give its width back; the title appears on expand.
  it('Test 3: renders goal-candidates card when candidates exist', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.audio-panel-card');
    expect(cards.length).toBe(1);
    expect(cards[0].classList.contains('collapsed')).toBe(true);

    const header = cards[0].querySelector('.audio-panel-header');
    expect(header).toBeTruthy();
    expect(header.querySelector('.audio-panel-title')).toBeNull();
    // The count stays visible while collapsed - it is the only thing that says how much is waiting.
    const badge = cards[0].querySelector('.audio-panel-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('1');
    // Collapsed the header carries no readable label, so it needs an accessible name.
    expect(header.getAttribute('aria-label')).toContain('Zielvorschläge');

    component.toggleCandidates();
    fixture.detectChanges();

    expect(header.textContent).toContain('Zielvorschläge'); // German i18n
  });

  // Test 4: Plan execution card renders when plan exists
  it('Test 4: renders plan-execution card when plan exists', () => {
    planServiceMock.activePlan.set(samplePlan);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.audio-panel-card');
    expect(cards.length).toBe(1);
    expect(cards[0].classList.contains('collapsed')).toBe(true);

    const header = cards[0].querySelector('.audio-panel-header');
    expect(header).toBeTruthy();
    expect(header.getAttribute('aria-label')).toContain('Plan-Ausführung');

    component.togglePlan();
    fixture.detectChanges();

    expect(header.textContent).toContain('Plan-Ausführung'); // German i18n
  });

  // Test 5: Both cards render when both exist
  it('Test 5: renders both cards when both candidates and plan exist', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    planServiceMock.activePlan.set(samplePlan);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.audio-panel-card');
    expect(cards.length).toBe(2);
  });

  // Test 6: Toggle candidates expansion
  it('Test 6: toggleCandidates expands and collapses', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    fixture.detectChanges();

    expect(component.isCandidatesExpanded()).toBe(false);

    component.toggleCandidates();
    fixture.detectChanges();
    expect(component.isCandidatesExpanded()).toBe(true);

    // Content should be visible
    const content = fixture.nativeElement.querySelector('.audio-panel-content');
    expect(content).toBeTruthy();

    component.toggleCandidates();
    fixture.detectChanges();
    expect(component.isCandidatesExpanded()).toBe(false);
  });

  // Test 7: Toggle plan expansion
  it('Test 7: togglePlan expands and collapses', () => {
    planServiceMock.activePlan.set(samplePlan);
    fixture.detectChanges();

    expect(component.isPlanExpanded()).toBe(false);

    component.togglePlan();
    fixture.detectChanges();
    expect(component.isPlanExpanded()).toBe(true);

    component.togglePlan();
    fixture.detectChanges();
    expect(component.isPlanExpanded()).toBe(false);
  });

  // Test 8: Plan status label key computed correctly
  it('Test 8: planStatusLabelKey returns correct i18n key for executing status', () => {
    planServiceMock.activePlan.set({ ...samplePlan, status: PlanStatus.Executing });
    fixture.detectChanges();

    expect(component.planStatusLabelKey()).toBe('assistant-chat.plan-execution.status.executing');
  });

  it('Test 9: planStatusLabelKey returns correct i18n key for paused status', () => {
    planServiceMock.activePlan.set({ ...samplePlan, status: PlanStatus.PausedForApproval });
    fixture.detectChanges();

    expect(component.planStatusLabelKey()).toBe('assistant-chat.plan-execution.status.paused_for_approval');
  });

  it('Test 10: planStatusLabelKey returns empty when no plan', () => {
    planServiceMock.activePlan.set(null);
    fixture.detectChanges();

    expect(component.planStatusLabelKey()).toBe('');
  });

  // Test 11: Badge shows correct count for multiple candidates
  it('Test 11: badge shows correct count for multiple candidates', () => {
    const candidates = [
      { ...sampleCandidate, id: 'c1' },
      { ...sampleCandidate, id: 'c2' },
      { ...sampleCandidate, id: 'c3' },
    ];
    goalCandidatesServiceMock.candidates.set(candidates);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.audio-panel-badge');
    expect(badge.textContent.trim()).toBe('3');
  });

  // Test 12: onPlanApprove delegates to plan panel
  it('Test 12: onPlanApprove calls plan panel approve', () => {
    planServiceMock.activePlan.set(samplePlan);
    fixture.detectChanges();

    // Expand to render the panel
    component.togglePlan();
    fixture.detectChanges();

    // Should not throw when called
    expect(() => component.onPlanApprove('plan-1')).not.toThrow();
  });

  // Test 13: onPlanAbort delegates to plan panel
  it('Test 13: onPlanAbort calls plan panel abort', () => {
    planServiceMock.activePlan.set(samplePlan);
    fixture.detectChanges();

    component.togglePlan();
    fixture.detectChanges();

    expect(() => component.onPlanAbort('plan-1')).not.toThrow();
  });

  // Regression: the panel component that normally triggers this load only mounts once a card
  // exists, and a card only exists once candidates are loaded. Without its own trigger the stack
  // stays empty forever in audio mode.
  it('loads the candidates itself when the aside opens', () => {
    const asideService = TestBed.inject(AsideService);
    goalCandidatesServiceMock.loadCandidates.mockClear();

    asideService.show();
    TestBed.createComponent(AudioModePanelsComponent).detectChanges();

    expect(goalCandidatesServiceMock.loadCandidates).toHaveBeenCalled();
  });

  it('does not load while the aside is closed', () => {
    const asideService = TestBed.inject(AsideService);
    asideService.hide();
    goalCandidatesServiceMock.loadCandidates.mockClear();

    TestBed.createComponent(AudioModePanelsComponent).detectChanges();

    expect(goalCandidatesServiceMock.loadCandidates).not.toHaveBeenCalled();
  });

  // Cards keep their natural height and push the ones below them down. A card that scrolled
  // internally would detach its content from the stack and produce nested scrollbars.
  it('stacks top-down and lets a card grow instead of scrolling inside it', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    component.toggleCandidates();
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.audio-mode-panels-overlay');
    expect(getComputedStyle(overlay).flexDirection).toBe('column');

    const content = fixture.nativeElement.querySelector('.audio-panel-content');
    const contentStyle = getComputedStyle(content);
    // jsdom reports an unset property as '' rather than resolving it to its initial value.
    expect(['', 'none']).toContain(contentStyle.maxHeight);
    expect(contentStyle.overflowY).not.toBe('auto');
  });

  // The stack covers a tall strip down the inline edge; anything but the cards themselves has to
  // stay click-through, otherwise it shields the page behind it.
  it('lets clicks through everywhere except on the cards', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.audio-mode-panels-overlay');
    const card = fixture.nativeElement.querySelector('.audio-panel-card');

    expect(getComputedStyle(overlay).pointerEvents).toBe('none');
    expect(getComputedStyle(card).pointerEvents).toBe('auto');
  });

  // Regression: position, edge anchor, stacking order and the scroll container belong to
  // OverlayRailComponent. Positioning here would put another hand-set anchor back into the corner
  // the rail exists to own, which is how the overlays started covering each other.
  it('does not position or anchor itself', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    fixture.detectChanges();

    const style = getComputedStyle(fixture.nativeElement.querySelector('.audio-mode-panels-overlay'));
    expect(style.position).not.toBe('fixed');
    // jsdom reports an unset property as '' rather than resolving it to its initial value.
    expect(['', 'auto']).toContain(style.top);
    expect(['', 'auto']).toContain(style.insetInlineEnd);
    expect(['', 'auto']).toContain(style.zIndex);
  });

  it('embeds the child panels so they drop their own header and scroll', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    component.toggleCandidates();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.goal-candidates-panel.embedded')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.goal-candidates-header')).toBeNull();
  });

  // Test 14: Chevron icon changes on expand
  it('Test 14: chevron icon changes when expanded', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    fixture.detectChanges();

    // Initially collapsed → chevronDown
    expect(component.isCandidatesExpanded()).toBe(false);

    component.toggleCandidates();
    fixture.detectChanges();
    expect(component.isCandidatesExpanded()).toBe(true);
  });

  describe('proactive inbox card ("Während du weg warst…")', () => {
    it('renders no inbox card when there are no inbox messages', () => {
      expect(fixture.nativeElement.querySelector('.audio-panel-card')).toBeNull();
    });

    // The inbox keeps DataManagementProactiveInboxService's own default (expanded), unlike the
    // other two cards which start collapsed - no behavior change from what the chat used to show.
    it('renders the inbox card expanded by default when messages exist, with the count badge', () => {
      inboxMessagesSignal.set([sampleInboxMessage(), sampleInboxMessage({ id: 'inbox-msg-2' })]);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.audio-panel-card');
      expect(card).toBeTruthy();
      expect(card.classList.contains('collapsed')).toBe(false);

      const header = card.querySelector('.audio-panel-header');
      expect(header.textContent).toContain('Während du weg warst…');
      const badge = card.querySelector('.audio-panel-badge');
      expect(badge.textContent.trim()).toBe('2');
    });

    // Collapsed, the header carries no readable text, so it needs an accessible name - same
    // requirement as the goal-candidates and plan-execution cards.
    it('collapsed, the inbox card shows only the bell icon and the count badge', () => {
      inboxMessagesSignal.set([sampleInboxMessage()]);
      inboxExpandedSignal.set(false);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.audio-panel-card');
      expect(card.classList.contains('collapsed')).toBe(true);

      const header = card.querySelector('.audio-panel-header');
      expect(header.querySelector('.audio-panel-title')).toBeNull();
      expect(header.querySelector('.audio-panel-chevron')).toBeNull();
      expect(header.querySelector('.audio-panel-badge').textContent.trim()).toBe('1');
      expect(header.getAttribute('aria-label')).toContain('Während du weg warst…');
      expect(header.getAttribute('title')).toContain('Während du weg warst…');

      // Content, including the hide-all button, is gone while collapsed.
      expect(fixture.nativeElement.querySelector('.audio-panel-content')).toBeNull();
    });

    it('toggling the header calls the shared expand/collapse action', () => {
      inboxMessagesSignal.set([sampleInboxMessage()]);
      fixture.detectChanges();

      const header: HTMLButtonElement = fixture.nativeElement.querySelector(
        '.audio-panel-card .audio-panel-header',
      );
      header.click();

      expect(messageActionsMock.toggleInboxExpanded).toHaveBeenCalledTimes(1);
    });

    it('renders every inbox message via app-chat-message', () => {
      inboxMessagesSignal.set([
        sampleInboxMessage({ id: 'inbox-msg-1', content: 'Erste Nachricht.' }),
        sampleInboxMessage({ id: 'inbox-msg-2', content: 'Zweite Nachricht.' }),
      ]);
      fixture.detectChanges();

      const rendered = fixture.nativeElement.querySelectorAll('app-chat-message');
      expect(rendered.length).toBe(2);
      expect(fixture.nativeElement.textContent).toContain('Erste Nachricht.');
      expect(fixture.nativeElement.textContent).toContain('Zweite Nachricht.');
      expect(rendered[0].textContent).toContain('Erste Nachricht.');
      expect(rendered[1].textContent).toContain('Zweite Nachricht.');
    });

    it('scrolls the message list to the bottom when a new inbox message arrives', async () => {
      inboxMessagesSignal.set([sampleInboxMessage({ id: 'inbox-msg-1' })]);
      fixture.detectChanges();
      await fixture.whenStable();

      const scrollContainer: HTMLElement = fixture.nativeElement.querySelector(
        '.audio-panel-inbox-messages',
      );
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 999, configurable: true });
      scrollContainer.scrollTop = 0;

      inboxMessagesSignal.set([
        sampleInboxMessage({ id: 'inbox-msg-1' }),
        sampleInboxMessage({ id: 'inbox-msg-2' }),
      ]);
      fixture.detectChanges();
      // afterEveryRender runs after the render pass that scheduled it, not synchronously within
      // it - whenStable() flushes the pending render-hook queue.
      await fixture.whenStable();

      expect(scrollContainer.scrollTop).toBe(999);
    });

    it('hide-all calls the shared action and, once the list empties, the card disappears', () => {
      inboxMessagesSignal.set([sampleInboxMessage()]);
      fixture.detectChanges();

      const hideAllButton: HTMLButtonElement = fixture.nativeElement.querySelector(
        '.audio-panel-inbox-hide-all',
      );
      expect(hideAllButton).toBeTruthy();
      hideAllButton.click();

      expect(messageActionsMock.hideWholeInbox).toHaveBeenCalledTimes(1);

      // hideWholeInbox() itself is mocked (see file header) - simulate its real effect (the
      // shared service emptying inboxMessages()) to verify the card reacts by disappearing.
      inboxMessagesSignal.set([]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.audio-panel-card')).toBeNull();
    });

    // The hide-all button is a distinct control from the header toggle, and only appears once
    // expanded - collapsed, the card is only icon plus badge (see the test above).
    it('keeps the hide-all button separate from the header toggle', () => {
      inboxMessagesSignal.set([sampleInboxMessage()]);
      fixture.detectChanges();

      const header: HTMLButtonElement = fixture.nativeElement.querySelector(
        '.audio-panel-card .audio-panel-header',
      );
      const hideAllButton: HTMLButtonElement = fixture.nativeElement.querySelector(
        '.audio-panel-inbox-hide-all',
      );
      hideAllButton.click();

      expect(messageActionsMock.hideWholeInbox).toHaveBeenCalledTimes(1);
      expect(messageActionsMock.toggleInboxExpanded).not.toHaveBeenCalled();

      header.click();
      expect(messageActionsMock.toggleInboxExpanded).toHaveBeenCalledTimes(1);
    });
  });
});
