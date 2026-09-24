// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Integration tests for stop-turn cancellation across the real ChatTurnControlService, the real
 * ChatFunctionExecutionService and the real UiActionEngineService. The stream's Metadata and Done
 * events are processed back to back, so a turn that ends normally must never look cancelled to a
 * function-call execution that is still running after it.
 */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ChatFunctionExecutionService } from './chat-function-execution.service';
import { ChatTurnControlService } from './chat-turn-control.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { NavigationVerdictService } from './navigation-verdict.service';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { UiActionEngineService } from 'src/app/domain/services/assistant/ui-action-engine.service';
import { UiActionValueResolverService } from 'src/app/domain/services/assistant/ui-action-value-resolver.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { SEARCH_STRATEGY } from 'src/app/domain/interfaces/search-strategy.interface';

const TRACKING_ID = 'tracking-1';
const UI_ACTION_STEP_COUNT = 3;

const uiActionCall = {
  functionName: 'open_client_dialog',
  uiActionTrackingId: TRACKING_ID,
  uiActionSteps: JSON.stringify({
    steps: Array.from({ length: UI_ACTION_STEP_COUNT }, () => ({ action: 'delay', delay: 0 })),
  }),
};

const navigationCall = (route: string) => ({ functionName: 'navigate_to', parameters: { route } });

describe('stop-turn cancellation across turn control, function execution and UI action engine', () => {
  let turnControl: ChatTurnControlService;
  let service: ChatFunctionExecutionService;
  let executeStep: ReturnType<typeof vi.fn>;
  let executeFunction: ReturnType<typeof vi.fn>;
  let reportUiActionResult: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    executeFunction = vi.fn(() => of({ success: true }));
    reportUiActionResult = vi.fn(() => of({ found: true, updated: true, error: null }));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ChatTurnControlService,
        ChatFunctionExecutionService,
        UiActionEngineService,
        UiActionValueResolverService,
        { provide: AssistantFunctionExecutionService, useValue: { executeFunction, executeFunctionsBatch: vi.fn() } },
        { provide: DataManagementAssistantService, useValue: { reportUiActionResult, cancelTurn: vi.fn(() => of({ accepted: true })) } },
        { provide: ConversationOrchestratorService, useValue: { messages: vi.fn(() => []), updateMessage: vi.fn() } },
        { provide: EVENT_BUS_TOKEN, useValue: { emit: vi.fn() } },
        { provide: OnboardingService, useValue: { requestTourStart: vi.fn() } },
        { provide: KlacksyNavigationService, useValue: { highlightNavIcon: vi.fn(() => true), navigateAndScroll: vi.fn(() => Promise.resolve({ success: true })) } },
        { provide: NavigationVerdictService, useValue: { apply: vi.fn(), report: vi.fn(), applySuspectedMiss: vi.fn() } },
        { provide: Router, useValue: { url: '/workplace/dashboard', navigate: vi.fn() } },
        { provide: SearchStateService, useValue: {} },
        { provide: SEARCH_STRATEGY, useValue: {} },
      ],
    });

    turnControl = TestBed.inject(ChatTurnControlService);
    turnControl.registerHooks({ silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false });
    service = TestBed.inject(ChatFunctionExecutionService);

    const engine = TestBed.inject(UiActionEngineService);
    executeStep = vi.spyOn(engine as unknown as { executeStep: () => Promise<void> }, 'executeStep') as unknown as ReturnType<typeof vi.fn>;
    executeStep.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs every step and the navigation and reports completed when Done ends the turn before step 2', async () => {
    turnControl.beginTurn('assistant-1');

    const execution = service.executeFunctionCalls([uiActionCall, navigationCall('/workplace/clients')]);
    turnControl.endTurn();
    await execution;

    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
    expect(executeFunction).toHaveBeenCalledTimes(1);
    expect(reportUiActionResult).toHaveBeenCalledTimes(1);
    expect(reportUiActionResult.mock.calls[0][0]).toMatchObject({ trackingId: TRACKING_ID, status: 'completed' });
  });

  it('does not stop a running execution merely because isTurnRunning is false', async () => {
    turnControl.beginTurn('assistant-1');
    executeStep.mockImplementationOnce(async () => {
      turnControl.endTurn();
    });

    await service.executeFunctionCalls([uiActionCall]);

    expect(turnControl.isTurnRunning()).toBe(false);
    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
    expect(reportUiActionResult.mock.calls[0][0]).toMatchObject({ status: 'completed' });
  });

  it('stops between step 1 and step 2 on a real user stop and neither reports nor navigates', async () => {
    turnControl.beginTurn('assistant-1');
    executeStep.mockImplementationOnce(async () => {
      void turnControl.stop('user-button');
    });

    await service.executeFunctionCalls([uiActionCall, navigationCall('/workplace/clients')]);

    expect(executeStep).toHaveBeenCalledTimes(1);
    expect(executeFunction).not.toHaveBeenCalled();
    expect(reportUiActionResult).not.toHaveBeenCalled();
  });

  it('runs nothing when Metadata arrives while the stop still waits for the server confirmation', async () => {
    turnControl.beginTurn('assistant-1');
    turnControl.setTurnId('turn-1');
    const stopping = turnControl.stop('user-button');
    expect(turnControl.isStopping()).toBe(true);

    await service.executeFunctionCalls([uiActionCall, navigationCall('/workplace/clients')]);
    turnControl.notifyTurnStopped([]);
    await stopping;

    expect(executeStep).not.toHaveBeenCalled();
    expect(executeFunction).not.toHaveBeenCalled();
    expect(reportUiActionResult).not.toHaveBeenCalled();
  });

  it('stops the navigation loop between two navigation calls on a real user stop', async () => {
    turnControl.beginTurn('assistant-1');
    executeFunction.mockImplementationOnce(() => {
      void turnControl.stop('user-button');
      return of({ success: true });
    });

    await service.executeFunctionCalls([navigationCall('/a'), navigationCall('/b')]);

    expect(executeFunction).toHaveBeenCalledTimes(1);
  });

  it('keeps the stop of an old turn from cancelling the next turn', async () => {
    turnControl.beginTurn('assistant-1');
    void turnControl.stop('superseded');

    turnControl.beginTurn('assistant-2');
    await service.executeFunctionCalls([uiActionCall, navigationCall('/workplace/clients')]);

    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
    expect(executeFunction).toHaveBeenCalledTimes(1);
    expect(reportUiActionResult.mock.calls[0][0]).toMatchObject({ status: 'completed' });
  });

  it('keeps the stop of a newer turn from cancelling the execution of the older turn', async () => {
    turnControl.beginTurn('assistant-1');
    executeStep.mockImplementationOnce(async () => {
      turnControl.endTurn();
      turnControl.beginTurn('assistant-2');
      void turnControl.stop('user-button');
    });

    await service.executeFunctionCalls([uiActionCall]);

    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
    expect(reportUiActionResult.mock.calls[0][0]).toMatchObject({ status: 'completed' });
  });

  it('does not treat a call made after a stopped turn ended as cancelled', async () => {
    turnControl.beginTurn('assistant-1');
    void turnControl.stop('user-button');
    expect(turnControl.isTurnRunning()).toBe(false);
    expect(turnControl.isStopping()).toBe(false);

    await service.executeFunctionCalls([uiActionCall]);

    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
  });

  it('ignores a stop that arrives after the turn already ended normally', async () => {
    turnControl.beginTurn('assistant-1');
    const execution = service.executeFunctionCalls([uiActionCall]);
    turnControl.endTurn();
    await turnControl.stop('user-button');
    await execution;

    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
    expect(reportUiActionResult.mock.calls[0][0]).toMatchObject({ status: 'completed' });
  });
});
