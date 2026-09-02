// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for the W1.4 UiAction outcome report: the browser is the only place that knows whether a
 * dispatched UI action really ran, so every exit of executeUiActionSteps must leave a verdict.
 */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ChatFunctionExecutionService } from './chat-function-execution.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { UiActionEngineService } from 'src/app/domain/services/assistant/ui-action-engine.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import {
  UI_ACTION_RESULT_EMPTY_CONFIG_ERROR,
  UI_ACTION_RESULT_STATUS_COMPLETED,
  UI_ACTION_RESULT_STATUS_FAILED,
} from 'src/app/domain/constants/ui-action-result.constants';

const TRACKING_ID = '2f7d5b1e-1c4a-4f2e-9d3b-5c6e7a8b9c01';
const STEPS_JSON = '{"steps":[{"action":"navigate","route":"/workplace/dashboard"}]}';

describe('ChatFunctionExecutionService UiAction report', () => {
  let service: ChatFunctionExecutionService;
  let executeConfig: ReturnType<typeof vi.fn>;
  let reportUiActionResult: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    executeConfig = vi.fn(() => Promise.resolve({ succeeded: true }));
    reportUiActionResult = vi.fn(() => of({ found: true, updated: true, error: null }));

    TestBed.configureTestingModule({
      providers: [
        ChatFunctionExecutionService,
        { provide: AssistantFunctionExecutionService, useValue: { executeFunction: vi.fn(), executeFunctionsBatch: vi.fn() } },
        { provide: UiActionEngineService, useValue: { executeConfig } },
        { provide: DataManagementAssistantService, useValue: { reportUiActionResult } },
        { provide: ConversationOrchestratorService, useValue: { messages: vi.fn(() => []), updateMessage: vi.fn() } },
        { provide: EVENT_BUS_TOKEN, useValue: { emit: vi.fn() } },
        { provide: OnboardingService, useValue: { requestTourStart: vi.fn() } },
        { provide: KlacksyNavigationService, useValue: { highlightNavIcon: vi.fn(), navigateAndScroll: vi.fn() } },
        { provide: Router, useValue: { url: '/workplace/dashboard' } },
      ],
    });
    service = TestBed.inject(ChatFunctionExecutionService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports completed after a successful run', async () => {
    await service.executeFunctionCalls([
      { functionName: 'open_dialog', uiActionSteps: STEPS_JSON, uiActionTrackingId: TRACKING_ID },
    ]);

    expect(reportUiActionResult).toHaveBeenCalledWith({
      trackingId: TRACKING_ID,
      status: UI_ACTION_RESULT_STATUS_COMPLETED,
      errorMessage: undefined,
    });
  });

  it('reads the tracking id from the PascalCase payload too', async () => {
    await service.executeFunctionCalls([
      { FunctionName: 'open_dialog', UiActionSteps: STEPS_JSON, UiActionTrackingId: TRACKING_ID },
    ]);

    expect(reportUiActionResult).toHaveBeenCalledWith(
      expect.objectContaining({ trackingId: TRACKING_ID, status: UI_ACTION_RESULT_STATUS_COMPLETED }),
    );
  });

  it('reports failed when the engine throws', async () => {
    executeConfig.mockRejectedValue(new Error('element not found'));

    await service.executeFunctionCalls([
      { functionName: 'open_dialog', uiActionSteps: STEPS_JSON, uiActionTrackingId: TRACKING_ID },
    ]);

    expect(reportUiActionResult).toHaveBeenCalledWith({
      trackingId: TRACKING_ID,
      status: UI_ACTION_RESULT_STATUS_FAILED,
      errorMessage: 'element not found',
    });
  });

  it('reports failed when the engine swallowed a step error (onError continue)', async () => {
    executeConfig.mockResolvedValue({ succeeded: false, failedStep: 'click', error: 'no such button' });

    await service.executeFunctionCalls([
      { functionName: 'open_dialog', uiActionSteps: STEPS_JSON, uiActionTrackingId: TRACKING_ID },
    ]);

    expect(reportUiActionResult).toHaveBeenCalledWith({
      trackingId: TRACKING_ID,
      status: UI_ACTION_RESULT_STATUS_FAILED,
      errorMessage: 'no such button',
    });
  });

  it('reports failed when the dispatch carries a config without steps', async () => {
    await service.executeFunctionCalls([
      { functionName: 'open_dialog', uiActionSteps: '{"steps":[]}', uiActionTrackingId: TRACKING_ID },
    ]);

    expect(executeConfig).not.toHaveBeenCalled();
    expect(reportUiActionResult).toHaveBeenCalledWith({
      trackingId: TRACKING_ID,
      status: UI_ACTION_RESULT_STATUS_FAILED,
      errorMessage: UI_ACTION_RESULT_EMPTY_CONFIG_ERROR,
    });
  });

  it('stays silent when the call carries no tracking id', async () => {
    await service.executeFunctionCalls([
      { functionName: 'open_dialog', uiActionSteps: STEPS_JSON },
    ]);

    expect(executeConfig).toHaveBeenCalled();
    expect(reportUiActionResult).not.toHaveBeenCalled();
  });

  it('never lets a failing report break the chat', async () => {
    reportUiActionResult.mockReturnValue(throwError(() => new Error('offline')));

    await expect(
      service.executeFunctionCalls([
        { functionName: 'open_dialog', uiActionSteps: STEPS_JSON, uiActionTrackingId: TRACKING_ID },
      ]),
    ).resolves.toBeUndefined();
  });
});
