// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for ChatFunctionExecutionService page navigation + nav-icon highlighting
 * on explain_page_* skill calls.
 */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { ChatFunctionExecutionService } from './chat-function-execution.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { UiActionEngineService } from 'src/app/domain/services/assistant/ui-action-engine.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { KlacksyNavigationService } from 'src/app/core/services/klacksy-navigation.service';
import { ONBOARDING_NAV_ICON, START_GUIDED_TOUR_SKILL } from 'src/app/domain/constants/onboarding-stations';
import {
  EXPLAIN_PAGE_SKILL_PREFIX,
  HEADER_LOGO_ICON_ID,
  HEADER_LOGO_IMAGE_ID,
} from 'src/app/domain/constants/page-explain-icons.constants';

describe('ChatFunctionExecutionService', () => {
  let service: ChatFunctionExecutionService;
  let mockHighlightNavIcon: ReturnType<typeof vi.fn>;
  let mockNavigateAndScroll: ReturnType<typeof vi.fn>;
  let mockEmit: ReturnType<typeof vi.fn>;
  let mockRequestTourStart: ReturnType<typeof vi.fn>;
  let routerMock: { url: string };

  beforeEach(() => {
    mockHighlightNavIcon = vi.fn(() => true);
    mockNavigateAndScroll = vi.fn(() => Promise.resolve({ success: true }));
    mockEmit = vi.fn();
    mockRequestTourStart = vi.fn();
    routerMock = { url: '/workplace/dashboard' };

    TestBed.configureTestingModule({
      providers: [
        ChatFunctionExecutionService,
        { provide: AssistantFunctionExecutionService, useValue: { executeFunction: vi.fn(), executeFunctionsBatch: vi.fn() } },
        { provide: UiActionEngineService, useValue: { executeConfig: vi.fn() } },
        { provide: ConversationOrchestratorService, useValue: { messages: vi.fn(() => []), updateMessage: vi.fn() } },
        { provide: EVENT_BUS_TOKEN, useValue: { emit: mockEmit } },
        { provide: OnboardingService, useValue: { requestTourStart: mockRequestTourStart } },
        { provide: KlacksyNavigationService, useValue: { highlightNavIcon: mockHighlightNavIcon, navigateAndScroll: mockNavigateAndScroll } },
        { provide: Router, useValue: routerMock },
      ],
    });
    service = TestBed.inject(ChatFunctionExecutionService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('navigates to the explained page when the user is elsewhere', async () => {
    await service.executeFunctionCalls([{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}schedule` }]);

    expect(mockNavigateAndScroll).toHaveBeenCalledTimes(1);
    expect(mockNavigateAndScroll).toHaveBeenCalledWith('/workplace/schedule');
    expect(mockHighlightNavIcon).not.toHaveBeenCalled();
  });

  it('only pulses the nav icon when the user is already on the explained page', async () => {
    routerMock.url = '/workplace/schedule';

    await service.executeFunctionCalls([{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}schedule` }]);

    expect(mockNavigateAndScroll).not.toHaveBeenCalled();
    expect(mockHighlightNavIcon).toHaveBeenCalledWith(ONBOARDING_NAV_ICON.Schedules);
  });

  it('treats sub-routes and query strings as being on the page', async () => {
    routerMock.url = '/workplace/schedule/2026?week=24';

    await service.executeFunctionCalls([{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}schedule` }]);

    expect(mockNavigateAndScroll).not.toHaveBeenCalled();
    expect(mockHighlightNavIcon).toHaveBeenCalledWith(ONBOARDING_NAV_ICON.Schedules);
  });

  it('does not collapse client-availability onto the client route', async () => {
    routerMock.url = '/workplace/client-availability';

    await service.executeFunctionCalls([{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}employees` }]);

    expect(mockNavigateAndScroll).toHaveBeenCalledWith('/workplace/client');
  });

  it('navigates concept explain skills to their home page', async () => {
    await service.executeFunctionCalls([{ functionName: 'explain_shift_lifecycle_order_to_shift' }]);

    expect(mockNavigateAndScroll).toHaveBeenCalledWith('/workplace/shift');
  });

  it('pulses the route icon for concept skills when already on their home page', async () => {
    routerMock.url = '/workplace/shift';

    await service.executeFunctionCalls([{ functionName: 'explain_shift_lifecycle_order_to_shift' }]);

    expect(mockNavigateAndScroll).not.toHaveBeenCalled();
    expect(mockHighlightNavIcon).toHaveBeenCalledWith(ONBOARDING_NAV_ICON.Shifts);
  });

  it('navigates to the profile page even though it has no nav icon', async () => {
    await service.executeFunctionCalls([{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}profile` }]);

    expect(mockNavigateAndScroll).toHaveBeenCalledWith('/workplace/profile');
  });

  it('falls back to the company-logo image when the dashboard logo icon is missing', async () => {
    mockHighlightNavIcon.mockReturnValueOnce(false).mockReturnValueOnce(true);

    await service.executeFunctionCalls([{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}dashboard` }]);

    expect(mockNavigateAndScroll).not.toHaveBeenCalled();
    expect(mockHighlightNavIcon).toHaveBeenCalledTimes(2);
    expect(mockHighlightNavIcon).toHaveBeenNthCalledWith(1, HEADER_LOGO_ICON_ID);
    expect(mockHighlightNavIcon).toHaveBeenNthCalledWith(2, HEADER_LOGO_IMAGE_ID);
  });

  it('stops after the first dashboard candidate when it exists', async () => {
    await service.executeFunctionCalls([{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}dashboard` }]);

    expect(mockHighlightNavIcon).toHaveBeenCalledTimes(1);
    expect(mockHighlightNavIcon).toHaveBeenCalledWith(HEADER_LOGO_ICON_ID);
  });

  it('does nothing for non-explain function names', async () => {
    await service.executeFunctionCalls([{ functionName: 'search_clients' }]);

    expect(mockHighlightNavIcon).not.toHaveBeenCalled();
    expect(mockNavigateAndScroll).not.toHaveBeenCalled();
  });

  it('does nothing for unmapped explain_page_* names', async () => {
    await service.executeFunctionCalls([{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}unknown` }]);

    expect(mockHighlightNavIcon).not.toHaveBeenCalled();
    expect(mockNavigateAndScroll).not.toHaveBeenCalled();
  });

  it('keeps processing the explain call after navigating (no continue)', async () => {
    await service.executeFunctionCalls([
      {
        functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}schedule`,
        result: 'Success. Data: {"ClientId":"client-1"}',
      },
    ]);

    expect(mockNavigateAndScroll).toHaveBeenCalledWith('/workplace/schedule');
    expect(mockEmit).toHaveBeenCalledWith(DomainEventType.SKILL_EXECUTED, {
      skillName: `${EXPLAIN_PAGE_SKILL_PREFIX}schedule`,
      clientId: 'client-1',
    });
  });

  it('still routes start_guided_tour to the onboarding service without page navigation', async () => {
    await service.executeFunctionCalls([{ functionName: START_GUIDED_TOUR_SKILL }]);

    expect(mockRequestTourStart).toHaveBeenCalledTimes(1);
    expect(mockHighlightNavIcon).not.toHaveBeenCalled();
    expect(mockNavigateAndScroll).not.toHaveBeenCalled();
  });
});
