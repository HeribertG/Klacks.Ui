// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ChatTurnControlService } from './chat-turn-control.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';

describe('ChatTurnControlService', () => {
  let service: ChatTurnControlService;
  let mockOrchestrator: { updateMessage: ReturnType<typeof vi.fn> };
  let mockAssistantService: { cancelTurn: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    mockOrchestrator = { updateMessage: vi.fn() };
    mockAssistantService = { cancelTurn: vi.fn(() => of({ accepted: true })) };

    TestBed.configureTestingModule({
      providers: [
        ChatTurnControlService,
        { provide: ConversationOrchestratorService, useValue: mockOrchestrator },
        { provide: DataManagementAssistantService, useValue: mockAssistantService },
      ],
    });
    service = TestBed.inject(ChatTurnControlService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a turn as running and not stopping', () => {
    service.beginTurn('msg-1');
    expect(service.isTurnRunning()).toBe(true);
    expect(service.isStopping()).toBe(false);
  });

  it('flips isTurnRunning to false synchronously the instant stop() is called (rule: nothing new starts)', () => {
    service.beginTurn('msg-1');
    void service.stop('user-button');
    expect(service.isTurnRunning()).toBe(false);
  });

  it('ignores stop() when no turn is running', async () => {
    const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooks);
    await service.stop('user-button');
    expect(hooks.silence).not.toHaveBeenCalled();
  });

  it('is reentrancy-guarded against a second stop() while the first is still resolving', async () => {
    service.beginTurn('msg-1');
    const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooks);

    const first = service.stop('user-button');
    const second = service.stop('barge-in');
    await Promise.all([first, vi.runAllTimersAsync(), second]);

    expect(hooks.silence).toHaveBeenCalledTimes(1);
  });

  it('runs silence immediately and hard-aborts immediately for superseded (no wait)', async () => {
    service.beginTurn('msg-1');
    service.setTurnId('turn-1');
    const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooks);

    await service.stop('superseded');

    expect(hooks.silence).toHaveBeenCalledOnce();
    expect(hooks.hardAbort).toHaveBeenCalledOnce();
    expect(mockAssistantService.cancelTurn).toHaveBeenCalledWith('turn-1');
  });

  it('hard-aborts immediately when no turnId is known yet (Etappe 2 backend absent)', async () => {
    service.beginTurn('msg-1');
    const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooks);

    await service.stop('user-button');

    expect(hooks.hardAbort).toHaveBeenCalledOnce();
    expect(mockAssistantService.cancelTurn).not.toHaveBeenCalled();
    expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
      wasInterrupted: true,
      interruptedSummary: { executed: [] },
    });
  });

  it('shows the cautious sentence on hard abort when tool steps had begun', async () => {
    service.beginTurn('msg-1');
    const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => true };
    service.registerHooks(hooks);

    await service.stop('user-button');

    expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
      wasInterrupted: true,
      interruptedSummary: null,
    });
  });

  it('hard-aborts when the cancel POST 404s (Etappe 2 backend absent)', async () => {
    service.beginTurn('msg-1');
    service.setTurnId('turn-1');
    mockAssistantService.cancelTurn.mockReturnValue(throwError(() => ({ status: 404 })));
    const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooks);

    const stopping = service.stop('user-button');
    await vi.runAllTimersAsync();
    await stopping;

    expect(hooks.hardAbort).toHaveBeenCalledOnce();
  });

  it('finalizes with the server summary when turn_stopped arrives within the grace window, without a hard abort', async () => {
    service.beginTurn('msg-1');
    service.setTurnId('turn-1');
    const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => true };
    service.registerHooks(hooks);

    const stopping = service.stop('user-button');
    service.notifyTurnStopped(['create_client']);
    await stopping;

    expect(hooks.hardAbort).not.toHaveBeenCalled();
    expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
      wasInterrupted: true,
      interruptedSummary: { executed: ['create_client'] },
    });
  });

  it('hard-aborts after the grace window elapses with no turn_stopped event', async () => {
    service.beginTurn('msg-1');
    service.setTurnId('turn-1');
    const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooks);

    const stopping = service.stop('user-button');
    await vi.advanceTimersByTimeAsync(3000);
    await stopping;

    expect(hooks.hardAbort).toHaveBeenCalledOnce();
  });

  it('keeps hooks registered across endTurn (component-lifetime registration)', async () => {
    const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooks);
    service.beginTurn('msg-1');
    service.endTurn();
    service.beginTurn('msg-2');

    await service.stop('panel-closed');

    expect(hooks.silence).toHaveBeenCalledOnce();
  });
});
