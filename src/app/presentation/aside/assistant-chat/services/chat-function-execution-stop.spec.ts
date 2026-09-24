// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Integration tests for stop-turn cancellation across the real ChatTurnControlService, the real
 * ChatFunctionExecutionService and the real UiActionEngineService. The stream's Metadata and Done
 * events are processed back to back, so a turn that ends normally must never look cancelled to a
 * function-call execution that is still running after it, and a stopped turn must stay cancelled
 * for its own execution even when the stop already completed before the Metadata arrived.
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

  const run = (calls: unknown[], turnSeq?: number): Promise<void> =>
    service.executeFunctionCalls(calls, undefined, undefined, turnSeq);

  it('runs every step and the navigation and reports completed when Done ends the turn before step 2', async () => {
    const seq = turnControl.beginTurn('assistant-1');

    const execution = run([uiActionCall, navigationCall('/workplace/clients')], seq);
    turnControl.endTurn();
    await execution;

    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
    expect(executeFunction).toHaveBeenCalledTimes(1);
    expect(reportUiActionResult).toHaveBeenCalledTimes(1);
    expect(reportUiActionResult.mock.calls[0][0]).toMatchObject({ trackingId: TRACKING_ID, status: 'completed' });
  });

  it('does not stop a running execution merely because isTurnRunning is false', async () => {
    const seq = turnControl.beginTurn('assistant-1');
    executeStep.mockImplementationOnce(async () => {
      turnControl.endTurn();
    });

    await run([uiActionCall], seq);

    expect(turnControl.isTurnRunning()).toBe(false);
    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
    expect(reportUiActionResult.mock.calls[0][0]).toMatchObject({ status: 'completed' });
  });

  it('never cancels a call that was not given a turn', async () => {
    turnControl.beginTurn('assistant-1');
    void turnControl.stop('user-button');

    await run([uiActionCall]);

    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
  });

  it('stops between step 1 and step 2 on a real user stop and neither reports nor navigates', async () => {
    const seq = turnControl.beginTurn('assistant-1');
    executeStep.mockImplementationOnce(async () => {
      void turnControl.stop('user-button');
    });

    await run([uiActionCall, navigationCall('/workplace/clients')], seq);

    expect(executeStep).toHaveBeenCalledTimes(1);
    expect(executeFunction).not.toHaveBeenCalled();
    expect(reportUiActionResult).not.toHaveBeenCalled();
  });

  it('runs nothing when Metadata arrives while the stop still waits for the server confirmation', async () => {
    const seq = turnControl.beginTurn('assistant-1');
    turnControl.setTurnId('turn-1');
    const stopping = turnControl.stop('user-button');
    expect(turnControl.isStopping()).toBe(true);

    await run([uiActionCall, navigationCall('/workplace/clients')], seq);
    turnControl.notifyTurnStopped([]);
    await stopping;

    expect(executeStep).not.toHaveBeenCalled();
    expect(executeFunction).not.toHaveBeenCalled();
    expect(reportUiActionResult).not.toHaveBeenCalled();
  });

  it('runs nothing when turn_stopped ended the turn before the Metadata of that same turn arrived', async () => {
    const seq = turnControl.beginTurn('assistant-1');
    turnControl.setTurnId('turn-1');
    const stopping = turnControl.stop('user-button');
    turnControl.notifyTurnStopped(['open_client_dialog']);
    await stopping;
    expect(turnControl.isTurnRunning()).toBe(false);
    expect(turnControl.isStopping()).toBe(false);

    await run([uiActionCall, navigationCall('/workplace/clients')], seq);

    expect(executeStep).not.toHaveBeenCalled();
    expect(executeFunction).not.toHaveBeenCalled();
    expect(reportUiActionResult).not.toHaveBeenCalled();
  });

  it('still treats the execution of a stopped turn as cancelled after the stop completed and the turn ended', async () => {
    const seq = turnControl.beginTurn('assistant-1');
    void turnControl.stop('user-button');
    expect(turnControl.isTurnRunning()).toBe(false);
    expect(turnControl.isStopping()).toBe(false);

    await run([uiActionCall], seq);

    expect(executeStep).not.toHaveBeenCalled();
  });

  it('stops the navigation loop between two navigation calls on a real user stop', async () => {
    const seq = turnControl.beginTurn('assistant-1');
    executeFunction.mockImplementationOnce(() => {
      void turnControl.stop('user-button');
      return of({ success: true });
    });

    await run([navigationCall('/a'), navigationCall('/b')], seq);

    expect(executeFunction).toHaveBeenCalledTimes(1);
  });

  it('keeps the stop of an old turn from cancelling the next turn', async () => {
    turnControl.beginTurn('assistant-1');
    void turnControl.stop('superseded');

    const seq = turnControl.beginTurn('assistant-2');
    await run([uiActionCall, navigationCall('/workplace/clients')], seq);

    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
    expect(executeFunction).toHaveBeenCalledTimes(1);
    expect(reportUiActionResult.mock.calls[0][0]).toMatchObject({ status: 'completed' });
  });

  it('keeps the stop of a newer turn from cancelling the execution of the older turn', async () => {
    const seq = turnControl.beginTurn('assistant-1');
    executeStep.mockImplementationOnce(async () => {
      turnControl.endTurn();
      turnControl.beginTurn('assistant-2');
      void turnControl.stop('user-button');
    });

    await run([uiActionCall], seq);

    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
    expect(reportUiActionResult.mock.calls[0][0]).toMatchObject({ status: 'completed' });
  });

  it('does not cancel the still running execution of an old turn when a new turn starts', async () => {
    const seq = turnControl.beginTurn('assistant-1');
    executeStep.mockImplementationOnce(async () => {
      turnControl.endTurn();
      turnControl.beginTurn('assistant-2');
    });

    await run([uiActionCall, navigationCall('/workplace/clients')], seq);

    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
    expect(executeFunction).toHaveBeenCalledTimes(1);
    expect(reportUiActionResult.mock.calls[0][0]).toMatchObject({ status: 'completed' });
  });

  it('keeps a stopped turn cancelled although a later turn was stopped as well', async () => {
    const seqA = turnControl.beginTurn('assistant-1');
    void turnControl.stop('superseded');
    turnControl.beginTurn('assistant-2');
    void turnControl.stop('user-button');

    await run([uiActionCall], seqA);

    expect(executeStep).not.toHaveBeenCalled();
  });

  it('ignores a stop that arrives after the turn already ended normally', async () => {
    const seq = turnControl.beginTurn('assistant-1');
    const execution = run([uiActionCall], seq);
    turnControl.endTurn();
    await turnControl.stop('user-button');
    await execution;

    expect(executeStep).toHaveBeenCalledTimes(UI_ACTION_STEP_COUNT);
    expect(reportUiActionResult.mock.calls[0][0]).toMatchObject({ status: 'completed' });
  });
});
