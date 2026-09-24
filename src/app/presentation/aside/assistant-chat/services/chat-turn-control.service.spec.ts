// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ChatTurnControlService, TURN_STOP_GRACE_MS } from './chat-turn-control.service';
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
    await vi.advanceTimersByTimeAsync(TURN_STOP_GRACE_MS);
    await stopping;

    expect(hooks.hardAbort).toHaveBeenCalledOnce();
  });

  it('snapshots hadToolSteps before hardAbort runs (hardAbort may clear the underlying signal)', async () => {
    service.beginTurn('msg-1');
    let toolStepsPresent = true;
    const hooks = {
      silence: vi.fn(),
      hardAbort: vi.fn(() => { toolStepsPresent = false; }),
      hadToolSteps: () => toolStepsPresent,
    };
    service.registerHooks(hooks);

    await service.stop('user-button');

    expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
      wasInterrupted: true,
      interruptedSummary: null,
    });
  });

  it("does not let an earlier turn's stale timer resolve a later turn (cross-turn isolation)", async () => {
    service.beginTurn('msg-a');
    const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooks);
    service.setTurnId('turn-a');

    const stopA = service.stop('user-button');
    service.notifyTurnStopped(['skill-a']);
    await stopA;

    hooks.hardAbort.mockClear();
    service.beginTurn('msg-b');
    service.setTurnId('turn-b');
    const stopB = service.stop('user-button');

    await vi.advanceTimersByTimeAsync(3000);
    await stopB;

    expect(hooks.hardAbort).toHaveBeenCalledOnce();
    expect(mockOrchestrator.updateMessage).toHaveBeenLastCalledWith('msg-b', {
      wasInterrupted: true,
      interruptedSummary: { executed: [] },
    });
  });

  it('abandons a stale stop continuation when a newer turn has already begun (turn-epoch guard)', async () => {
    service.beginTurn('msg-a');
    service.setTurnId('turn-a');
    const hooksA = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooksA);

    const stopA = service.stop('user-button'); // waitsForServer=true, suspends on the grace wait

    // A newer turn begins before A's wait resolves.
    service.beginTurn('msg-b');

    await vi.advanceTimersByTimeAsync(3000);
    await stopA;

    // A's stale continuation must not touch B's message or B's state.
    expect(mockOrchestrator.updateMessage).not.toHaveBeenCalledWith('msg-a', expect.anything());
    expect(hooksA.hardAbort).not.toHaveBeenCalled();
    expect(service.isTurnRunning()).toBe(true); // B is still running, untouched
  });

  it('does not let an orphaned wait from an old turn contaminate a new turn that starts stopping while the old one is still pending', async () => {
    service.beginTurn('msg-a');
    service.setTurnId('turn-a');
    const hooksA = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooksA);
    const stopA = service.stop('user-button'); // suspends on the grace wait, never settled

    service.beginTurn('msg-b');
    service.setTurnId('turn-b');
    const hooksB = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooksB);
    const stopB = service.stop('user-button'); // also suspends on its own grace wait

    service.notifyTurnStopped(['skill-b']); // B's real server confirmation arrives

    await Promise.all([stopA, stopB]);

    expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-b', {
      wasInterrupted: true,
      interruptedSummary: { executed: ['skill-b'] },
    });
    expect(mockOrchestrator.updateMessage).not.toHaveBeenCalledWith('msg-a', expect.anything());
    expect(hooksB.hardAbort).not.toHaveBeenCalled();
  });

  it('a stop() call suspended when the turn finishes normally resolves cleanly with no interruption shown', async () => {
    service.beginTurn('msg-a');
    service.setTurnId('turn-a');
    const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
    service.registerHooks(hooks);

    const stopping = service.stop('user-button'); // suspends on the grace wait
    service.endTurn(); // the stream finished normally while stop() was still waiting

    await vi.advanceTimersByTimeAsync(TURN_STOP_GRACE_MS);
    await stopping;

    expect(hooks.hardAbort).not.toHaveBeenCalled();
    expect(mockOrchestrator.updateMessage).not.toHaveBeenCalledWith('msg-a', expect.anything());
  });

  it('recovers isTurnRunning/isStopping for the next turn even if a hook throws', async () => {
    service.beginTurn('msg-1');
    const hooks = {
      silence: vi.fn(),
      hardAbort: vi.fn(() => {
        throw new Error('boom');
      }),
      hadToolSteps: () => false,
    };
    service.registerHooks(hooks);

    await expect(service.stop('user-button')).rejects.toThrow('boom');

    expect(service.isTurnRunning()).toBe(false);
    expect(service.isStopping()).toBe(false);

    service.beginTurn('msg-2');
    expect(service.isTurnRunning()).toBe(true);
    expect(service.isStopping()).toBe(false);
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

  describe('captureCancellation', () => {
    beforeEach(() => {
      service.registerHooks({ silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false });
    });

    it('never fires when no turn is live', () => {
      const isCancelled = service.captureCancellation();
      expect(isCancelled()).toBe(false);
    });

    it('is false while the turn runs and stays false after it ends normally', () => {
      service.beginTurn('msg-1');
      const isCancelled = service.captureCancellation();
      expect(isCancelled()).toBe(false);

      service.endTurn();

      expect(service.isTurnRunning()).toBe(false);
      expect(isCancelled()).toBe(false);
    });

    it('turns true the instant stop() is called and stays true after the stop completed', async () => {
      service.beginTurn('msg-1');
      const isCancelled = service.captureCancellation();

      void service.stop('user-button');
      expect(isCancelled()).toBe(true);

      await vi.runAllTimersAsync();
      expect(service.isTurnRunning()).toBe(false);
      expect(isCancelled()).toBe(true);
    });

    it('stays true for a stop that lost the race against the normal end of the turn', async () => {
      service.beginTurn('msg-1');
      service.setTurnId('turn-1');
      const isCancelled = service.captureCancellation();

      const stopping = service.stop('user-button');
      service.endTurn();
      await stopping;

      expect(isCancelled()).toBe(true);
      expect(mockOrchestrator.updateMessage).not.toHaveBeenCalled();
    });

    it('ignores a stop() that arrives after the turn ended normally', async () => {
      service.beginTurn('msg-1');
      const isCancelled = service.captureCancellation();
      service.endTurn();

      await service.stop('user-button');

      expect(isCancelled()).toBe(false);
    });

    it('does not let the stop of an old turn cancel the next turn', async () => {
      service.beginTurn('msg-1');
      await service.stop('superseded');

      service.beginTurn('msg-2');
      const isCancelledNext = service.captureCancellation();

      expect(isCancelledNext()).toBe(false);
    });

    it('does not let the stop of a newer turn cancel a check captured for the older one', async () => {
      service.beginTurn('msg-1');
      const isCancelledOld = service.captureCancellation();
      service.endTurn();

      service.beginTurn('msg-2');
      const isCancelledNew = service.captureCancellation();
      await service.stop('user-button');

      expect(isCancelledNew()).toBe(true);
      expect(isCancelledOld()).toBe(false);
    });

    it('does not treat a call after a stopped turn ended as cancelled', async () => {
      service.beginTurn('msg-1');
      await service.stop('user-button');

      const isCancelled = service.captureCancellation();

      expect(isCancelled()).toBe(false);
    });
  });
});
