// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for ChatFunctionExecutionService page navigation + nav-icon highlighting
 * on explain_page_* skill calls.
 */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ChatFunctionExecutionService } from './chat-function-execution.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { ChatTurnControlService } from './chat-turn-control.service';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { UiActionEngineService } from 'src/app/domain/services/assistant/ui-action-engine.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { NavigationVerdictService } from './navigation-verdict.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ONBOARDING_KIND, ONBOARDING_NAV_ICON, START_GUIDED_TOUR_KIND_PARAM, START_GUIDED_TOUR_SKILL } from 'src/app/domain/constants/onboarding-stations';
import {
  EXPLAIN_PAGE_SKILL_PREFIX,
  HEADER_LOGO_ICON_ID,
  HEADER_LOGO_IMAGE_ID,
} from 'src/app/domain/constants/page-explain-icons.constants';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';

describe('ChatFunctionExecutionService', () => {
  let service: ChatFunctionExecutionService;
  let mockHighlightNavIcon: ReturnType<typeof vi.fn>;
  let mockNavigateAndScroll: ReturnType<typeof vi.fn>;
  let mockEmit: ReturnType<typeof vi.fn>;
  let mockRequestTourStart: ReturnType<typeof vi.fn>;
  let mockResolveTourKind: ReturnType<typeof vi.fn>;
  let mockReportUiActionResult: ReturnType<typeof vi.fn>;
  let mockExecuteFunction: ReturnType<typeof vi.fn>;
  let mockExecuteConfig: ReturnType<typeof vi.fn>;
  let routerMock: { url: string };
  let cancelled: boolean;
  let mockCaptureCancellation: ReturnType<typeof vi.fn>;
  let mockHasPermission: ReturnType<typeof vi.fn>;
  const TURN_SEQ = 3;

  beforeEach(() => {
    mockHighlightNavIcon = vi.fn(() => true);
    mockNavigateAndScroll = vi.fn(() => Promise.resolve({ success: true }));
    mockEmit = vi.fn();
    mockRequestTourStart = vi.fn();
    mockResolveTourKind = vi.fn((requested?: string) => (requested === ONBOARDING_KIND.Setup ? ONBOARDING_KIND.Setup : ONBOARDING_KIND.Intro));
    mockReportUiActionResult = vi.fn(() => of({ found: true, updated: true, error: null }));
    mockExecuteFunction = vi.fn(() => of({ success: true }));
    mockExecuteConfig = vi.fn(() => Promise.resolve({ succeeded: true }));
    routerMock = { url: '/workplace/dashboard' };
    cancelled = false;
    mockCaptureCancellation = vi.fn(() => () => cancelled);
    mockHasPermission = vi.fn(() => true);

    TestBed.configureTestingModule({
      providers: [
        ChatFunctionExecutionService,
        { provide: AssistantFunctionExecutionService, useValue: { executeFunction: mockExecuteFunction, executeFunctionsBatch: vi.fn() } },
        { provide: UiActionEngineService, useValue: { executeConfig: mockExecuteConfig } },
        { provide: DataManagementAssistantService, useValue: { reportUiActionResult: mockReportUiActionResult } },
        { provide: ConversationOrchestratorService, useValue: { messages: vi.fn(() => []), updateMessage: vi.fn() } },
        { provide: ChatTurnControlService, useValue: { captureCancellation: mockCaptureCancellation, beginExecution: vi.fn(), endExecution: vi.fn(() => false) } },
        { provide: EVENT_BUS_TOKEN, useValue: { emit: mockEmit } },
        { provide: OnboardingService, useValue: { requestTourStart: mockRequestTourStart, resolveTourKind: mockResolveTourKind } },
        { provide: KlacksyNavigationService, useValue: { highlightNavIcon: mockHighlightNavIcon, navigateAndScroll: mockNavigateAndScroll } },
        { provide: NavigationVerdictService, useValue: { apply: vi.fn(), report: vi.fn(), applySuspectedMiss: vi.fn() } },
        { provide: Router, useValue: routerMock },
        { provide: AuthorizationService, useValue: { hasPermission: mockHasPermission } },
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

  it('navigates the order lifecycle concept skill to the empty shift mask', async () => {
    await service.executeFunctionCalls([{ functionName: 'explain_shift_lifecycle_order_to_shift' }]);

    expect(mockNavigateAndScroll).toHaveBeenCalledWith('/workplace/new-shift');
  });

  it('pulses the route icon for concept skills when already on their home page', async () => {
    routerMock.url = '/workplace/new-shift';

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

  it('brings the user to the ERP card for the ERP explain skill', async () => {
    await service.executeFunctionCalls([{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}settings_erp_drop_points` }]);

    expect(mockNavigateAndScroll).toHaveBeenCalledWith('/workplace/settings', 'erp-drop-points');
  });

  it('still scrolls to the ERP card when the user is already on the settings page', async () => {
    routerMock.url = '/workplace/settings';

    await service.executeFunctionCalls([{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}settings_erp_drop_points` }]);

    expect(mockNavigateAndScroll).toHaveBeenCalledWith('/workplace/settings', 'erp-drop-points');
  });

  it('brings the user to the settings card a concept skill explains', async () => {
    await service.executeFunctionCalls([{ functionName: 'explain_whisper_setup' }]);

    expect(mockNavigateAndScroll).toHaveBeenCalledWith('/workplace/settings', 'whisper-plugin');
  });

  it('does not send a user to a page the route guard would refuse', async () => {
    mockHasPermission.mockReturnValue(false);

    await service.executeFunctionCalls([{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}settings_erp_drop_points` }]);

    expect(mockNavigateAndScroll).not.toHaveBeenCalled();
    expect(mockHasPermission).toHaveBeenCalledWith(PERMISSIONS.CanViewSettings);
  });

  it('navigates as soon as an explain call streams in', () => {
    service.navigateForStreamedExplainCall(`${EXPLAIN_PAGE_SKILL_PREFIX}schedule`, TURN_SEQ);

    expect(mockNavigateAndScroll).toHaveBeenCalledWith('/workplace/schedule');
  });

  it('ignores streamed calls that are not explain skills', () => {
    service.navigateForStreamedExplainCall('search_clients', TURN_SEQ);

    expect(mockNavigateAndScroll).not.toHaveBeenCalled();
    expect(mockHighlightNavIcon).not.toHaveBeenCalled();
  });

  it('does not navigate a second time for an explain call that already navigated while streaming', async () => {
    service.navigateForStreamedExplainCall(`${EXPLAIN_PAGE_SKILL_PREFIX}settings_erp_drop_points`, TURN_SEQ);

    await service.executeFunctionCalls(
      [{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}settings_erp_drop_points` }],
      undefined,
      undefined,
      TURN_SEQ,
    );

    expect(mockNavigateAndScroll).toHaveBeenCalledTimes(1);
  });

  it('navigates in the metadata pass when the streamed explain call belonged to an earlier turn', async () => {
    service.navigateForStreamedExplainCall(`${EXPLAIN_PAGE_SKILL_PREFIX}schedule`, TURN_SEQ);

    await service.executeFunctionCalls(
      [{ functionName: `${EXPLAIN_PAGE_SKILL_PREFIX}schedule` }],
      undefined,
      undefined,
      TURN_SEQ + 1,
    );

    expect(mockNavigateAndScroll).toHaveBeenCalledTimes(2);
  });

  it('still routes start_guided_tour to the onboarding service without page navigation', async () => {
    await service.executeFunctionCalls([{ functionName: START_GUIDED_TOUR_SKILL }]);

    expect(mockRequestTourStart).toHaveBeenCalledTimes(1);
    expect(mockHighlightNavIcon).not.toHaveBeenCalled();
    expect(mockNavigateAndScroll).not.toHaveBeenCalled();
  });

  it('passes the kind parameter of start_guided_tour through the kind resolver', async () => {
    await service.executeFunctionCalls([
      { functionName: START_GUIDED_TOUR_SKILL, parameters: { [START_GUIDED_TOUR_KIND_PARAM]: ONBOARDING_KIND.Setup } },
    ]);

    expect(mockResolveTourKind).toHaveBeenCalledWith(ONBOARDING_KIND.Setup);
    expect(mockRequestTourStart).toHaveBeenCalledWith(ONBOARDING_KIND.Setup);
  });

  it('resolves a start_guided_tour call without kind (intro fallback)', async () => {
    await service.executeFunctionCalls([{ functionName: START_GUIDED_TOUR_SKILL }]);

    expect(mockResolveTourKind).toHaveBeenCalledWith(undefined);
    expect(mockRequestTourStart).toHaveBeenCalledWith(ONBOARDING_KIND.Intro);
  });

  it('does not report a UI action outcome when the turn was cancelled mid-run', async () => {
    mockExecuteConfig.mockImplementationOnce(async () => {
      cancelled = true;
      return { succeeded: false, cancelled: true };
    });

    await service.executeFunctionCalls([
      { functionName: 'create_client', uiActionSteps: JSON.stringify({ steps: [{ action: 'delay' }] }) },
    ]);

    expect(mockReportUiActionResult).not.toHaveBeenCalled();
  });

  it('stops the navigation-call loop once the turn was stopped', async () => {
    const secondCall = vi.fn();
    const calls = [
      { functionName: 'navigate_to', parameters: { route: '/a' } },
      { functionName: 'navigate_to', parameters: { route: '/b' } },
    ];
    mockExecuteFunction.mockImplementationOnce(() => {
      cancelled = true;
      return of({ success: true });
    });
    mockExecuteFunction.mockImplementationOnce(secondCall);

    await service.executeFunctionCalls(calls, undefined, undefined, TURN_SEQ);

    expect(secondCall).not.toHaveBeenCalled();
  });

  it('binds cancellation to the turn it was given', async () => {
    await service.executeFunctionCalls([{ functionName: 'navigate_to', parameters: { route: '/a' } }], undefined, undefined, TURN_SEQ);

    expect(mockCaptureCancellation).toHaveBeenCalledWith(TURN_SEQ);
  });

  it('asks for no cancellation when it was not given a turn', async () => {
    await service.executeFunctionCalls([{ functionName: 'navigate_to', parameters: { route: '/a' } }]);

    expect(mockCaptureCancellation).not.toHaveBeenCalled();
  });
});
