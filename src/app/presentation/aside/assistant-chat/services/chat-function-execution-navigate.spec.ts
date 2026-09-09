// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Regression tests for the navigate_to execution chain with the REAL
 * AssistantFunctionExecutionService: a streamed navigate_to function call
 * must end in a router navigation to the resolved page route.
 */
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ChatFunctionExecutionService } from './chat-function-execution.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { UiActionEngineService } from 'src/app/domain/services/assistant/ui-action-engine.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { NavigationVerdictService } from './navigation-verdict.service';

const MESSAGE_ID = 'msg_turn_1';
const UTTERANCE = 'zeige mir die uploadfläche';

describe('ChatFunctionExecutionService navigate_to chain', () => {
  let service: ChatFunctionExecutionService;
  let routerMock: { url: string; navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };
  let klacksyNavigationMock: { highlightNavIcon: ReturnType<typeof vi.fn>; navigateAndScroll: ReturnType<typeof vi.fn> };
  let verdictMock: {
    apply: ReturnType<typeof vi.fn>;
    report: ReturnType<typeof vi.fn>;
    applySuspectedMiss: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    routerMock = {
      url: '/workplace/shift',
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };
    verdictMock = { apply: vi.fn(), report: vi.fn(), applySuspectedMiss: vi.fn() };
    klacksyNavigationMock = {
      highlightNavIcon: vi.fn(() => true),
      navigateAndScroll: vi.fn().mockResolvedValue({ success: true }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ChatFunctionExecutionService,
        AssistantFunctionExecutionService,
        { provide: UiActionEngineService, useValue: { executeConfig: vi.fn() } },
        { provide: DataManagementAssistantService, useValue: { reportUiActionResult: vi.fn(() => of({ found: true, updated: true, error: null })) } },
        { provide: ConversationOrchestratorService, useValue: { messages: vi.fn(() => []), updateMessage: vi.fn() } },
        { provide: EVENT_BUS_TOKEN, useValue: { emit: vi.fn() } },
        { provide: OnboardingService, useValue: { requestTourStart: vi.fn() } },
        { provide: KlacksyNavigationService, useValue: klacksyNavigationMock },
        { provide: NavigationVerdictService, useValue: verdictMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    service = TestBed.inject(ChatFunctionExecutionService);
  });

  it('navigates to new-shift for a streamed navigate_to call (page parameter only)', async () => {
    await service.executeFunctionCalls([
      { functionName: 'navigate_to', parameters: { page: 'new-shift' } },
    ]);

    expect(klacksyNavigationMock.navigateAndScroll).toHaveBeenCalledWith('/workplace/new-shift', undefined);
  });

  it('navigates using the backend route from the result when present', async () => {
    await service.executeFunctionCalls([
      {
        functionName: 'navigate_to',
        parameters: { page: 'new-shift' },
        result: 'Success. Data: {"Page":"new-shift","Route":"/workplace/new-shift"}',
      },
    ]);

    expect(klacksyNavigationMock.navigateAndScroll).toHaveBeenCalledWith('/workplace/new-shift', undefined);
  });

  it('navigates a result-driven nav skill (open_schedule) and applies its query params', async () => {
    await service.executeFunctionCalls([
      {
        functionName: 'open_schedule',
        parameters: { groupName: 'Biel/Bienne' },
        result: 'Open schedule for group Biel/Bienne. Data: {"Route":"/workplace/schedule?groupId=abc-123","GroupId":"abc-123"}',
      },
    ]);

    expect(klacksyNavigationMock.navigateAndScroll).toHaveBeenCalledWith(
      '/workplace/schedule?groupId=abc-123',
      undefined,
    );
  });

  it('hands the browser verdict to the message the turn belongs to', async () => {
    klacksyNavigationMock.navigateAndScroll.mockResolvedValue({ success: false, reason: 'target-not-found' });

    await service.executeFunctionCalls(
      [{ functionName: 'navigate_to', parameters: { page: 'settings', target: 'erp-drop-points' } }],
      MESSAGE_ID,
      UTTERANCE,
    );

    expect(verdictMock.apply).toHaveBeenCalledWith(
      MESSAGE_ID,
      { success: false, reason: 'target-not-found' },
      '/workplace/settings',
      'erp-drop-points',
      UTTERANCE,
    );
  });

  it('reports a navigation that scrolled, so the miss rate has a denominator', async () => {
    await service.executeFunctionCalls(
      [{ functionName: 'navigate_to', parameters: { page: 'settings', target: 'erp-drop-points' } }],
      MESSAGE_ID,
    );

    expect(verdictMock.apply).toHaveBeenCalledWith(
      MESSAGE_ID,
      { success: true },
      '/workplace/settings',
      'erp-drop-points',
      undefined,
    );
  });

  it('appends only the verdict of the last navigation when several ran in one turn', async () => {
    await service.executeFunctionCalls(
      [
        { functionName: 'navigate_to', parameters: { page: 'settings', target: 'erp-drop-points' } },
        { functionName: 'navigate_to', parameters: { page: 'shift', target: 'shift-list' } },
      ],
      MESSAGE_ID,
    );

    expect(verdictMock.report).toHaveBeenCalledTimes(1);
    expect(verdictMock.report.mock.calls[0][2]).toBe('erp-drop-points');
    expect(verdictMock.apply).toHaveBeenCalledTimes(1);
    expect(verdictMock.apply.mock.calls[0][3]).toBe('shift-list');
  });

  it('only reports when no message id was handed in', async () => {
    await service.executeFunctionCalls([
      { functionName: 'navigate_to', parameters: { page: 'settings', target: 'erp-drop-points' } },
    ]);

    expect(verdictMock.apply).not.toHaveBeenCalled();
    expect(verdictMock.report).toHaveBeenCalledTimes(1);
  });

  it('rejects navigation when the resolved route leaves the workplace area', async () => {
    await service.executeFunctionCalls([
      {
        functionName: 'navigate_to',
        parameters: { page: 'new-shift' },
        result: 'Success. Data: {"Route":"new-shift"}',
      },
    ]);

    expect(klacksyNavigationMock.navigateAndScroll).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
