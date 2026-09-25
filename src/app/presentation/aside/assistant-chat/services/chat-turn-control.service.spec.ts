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
    service.notifyTurnStopped('turn-1', ['create_client'], 1);
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
    service.notifyTurnStopped('turn-a', ['skill-a'], 1);
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

    service.notifyTurnStopped('turn-b', ['skill-b'], 1); // B's real server confirmation arrives

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

    it('is false while the turn runs and stays false after it ends normally', () => {
      const seq = service.beginTurn('msg-1');
      const isCancelled = service.captureCancellation(seq);
      expect(isCancelled()).toBe(false);

      service.endTurn();

      expect(service.isTurnRunning()).toBe(false);
      expect(isCancelled()).toBe(false);
    });

    it('turns true the instant stop() is called and stays true after the stop completed', async () => {
      const seq = service.beginTurn('msg-1');
      const isCancelled = service.captureCancellation(seq);

      void service.stop('user-button');
      expect(isCancelled()).toBe(true);

      await vi.runAllTimersAsync();
      expect(service.isTurnRunning()).toBe(false);
      expect(isCancelled()).toBe(true);
    });

    it('stays true for a stop that lost the race against the normal end of the turn', async () => {
      const seq = service.beginTurn('msg-1');
      service.setTurnId('turn-1');
      const isCancelled = service.captureCancellation(seq);

      const stopping = service.stop('user-button');
      service.endTurn();
      await stopping;

      expect(isCancelled()).toBe(true);
      expect(mockOrchestrator.updateMessage).not.toHaveBeenCalled();
    });

    it('binds a check created after the stop completed to the stopped turn, not to the live one', async () => {
      const seq = service.beginTurn('msg-1');
      service.setTurnId('turn-1');
      const stopping = service.stop('user-button');
      service.notifyTurnStopped('turn-1', [], 0);
      await stopping;

      const isCancelled = service.captureCancellation(seq);

      expect(service.isTurnRunning()).toBe(false);
      expect(service.isStopping()).toBe(false);
      expect(isCancelled()).toBe(true);
    });

    it('ignores a stop() that arrives after the turn ended normally', async () => {
      const seq = service.beginTurn('msg-1');
      const isCancelled = service.captureCancellation(seq);
      service.endTurn();

      await service.stop('user-button');

      expect(isCancelled()).toBe(false);
    });

    it('does not let the stop of an old turn cancel the next turn', async () => {
      service.beginTurn('msg-1');
      await service.stop('superseded');

      const seq = service.beginTurn('msg-2');

      expect(service.captureCancellation(seq)()).toBe(false);
    });

    it('does not let the stop of a newer turn cancel a check captured for the older one', async () => {
      const oldSeq = service.beginTurn('msg-1');
      const isCancelledOld = service.captureCancellation(oldSeq);
      service.endTurn();

      const newSeq = service.beginTurn('msg-2');
      const isCancelledNew = service.captureCancellation(newSeq);
      await service.stop('user-button');

      expect(isCancelledNew()).toBe(true);
      expect(isCancelledOld()).toBe(false);
    });

    it('does not let the start of a new turn cancel the older turn', () => {
      const oldSeq = service.beginTurn('msg-1');
      const isCancelledOld = service.captureCancellation(oldSeq);
      service.endTurn();

      service.beginTurn('msg-2');

      expect(isCancelledOld()).toBe(false);
    });

    it('keeps an older stopped turn cancelled after a later turn was stopped too', async () => {
      const oldSeq = service.beginTurn('msg-1');
      await service.stop('superseded');
      service.beginTurn('msg-2');
      await service.stop('user-button');

      expect(service.captureCancellation(oldSeq)()).toBe(true);
    });
  });

  describe('execution cancellation', () => {
    it('is not executing until an execution begins', () => {
      expect(service.isExecuting()).toBe(false);
      expect(service.isMessageExecuting('msg-1')).toBe(false);
    });

    it('is executing between beginExecution and endExecution, for exactly that message', () => {
      const seq = service.beginTurn('msg-1');

      service.beginExecution(seq, 'msg-1');
      expect(service.isExecuting()).toBe(true);
      expect(service.isMessageExecuting('msg-1')).toBe(true);
      expect(service.isMessageExecuting('msg-2')).toBe(false);

      service.endExecution(seq);
      expect(service.isExecuting()).toBe(false);
      expect(service.isMessageExecuting('msg-1')).toBe(false);
    });

    it('keeps the execution independent of the turn: endTurn() does not end it', () => {
      const seq = service.beginTurn('msg-1');
      service.beginExecution(seq, 'msg-1');

      service.endTurn();

      expect(service.isTurnRunning()).toBe(false);
      expect(service.isExecuting()).toBe(true);
    });

    it('cancelExecution marks the sequence as stopped and hides the running state at once', () => {
      const seq = service.beginTurn('msg-1');
      service.endTurn();
      service.beginExecution(seq, 'msg-1');
      const isCancelled = service.captureCancellation(seq);

      service.cancelExecution(seq);

      expect(isCancelled()).toBe(true);
      expect(service.isExecuting()).toBe(false);
      expect(service.isMessageExecuting('msg-1')).toBe(false);
    });

    it('cancelExecution touches neither hooks, turn state, the epoch nor the backend', async () => {
      const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
      service.registerHooks(hooks);
      const seq = service.beginTurn('msg-1');
      service.setTurnId('turn-1');
      service.beginExecution(seq, 'msg-1');

      service.cancelExecution(seq);

      expect(hooks.silence).not.toHaveBeenCalled();
      expect(hooks.hardAbort).not.toHaveBeenCalled();
      expect(mockAssistantService.cancelTurn).not.toHaveBeenCalled();
      expect(mockOrchestrator.updateMessage).not.toHaveBeenCalled();
      expect(service.isTurnRunning()).toBe(true);
      expect(service.isStopping()).toBe(false);

      const stopping = service.stop('user-button');
      service.notifyTurnStopped('turn-1', [], 0);
      await stopping;
      expect(hooks.silence).toHaveBeenCalledTimes(1);
    });

    it('cancelExecution does nothing when that sequence has no running execution', () => {
      const seq = service.beginTurn('msg-1');

      service.cancelExecution(seq);

      expect(service.captureCancellation(seq)()).toBe(false);
    });

    it('cancelExecution is idempotent', () => {
      const seq = service.beginTurn('msg-1');
      service.beginExecution(seq, 'msg-1');

      service.cancelExecution(seq);
      service.cancelExecution(seq);

      expect(service.captureCancellation(seq)()).toBe(true);
      expect(service.isExecuting()).toBe(false);
    });

    it('cancelExecution does not pre-cancel an execution that begins later for the same sequence', () => {
      const seq = service.beginTurn('msg-1');

      service.cancelExecution(seq);
      service.beginExecution(seq, 'msg-1');

      expect(service.captureCancellation(seq)()).toBe(false);
      expect(service.isExecuting()).toBe(true);
    });

    it('endExecution tells whether the execution was cancelled explicitly', () => {
      const cancelledSeq = service.beginTurn('msg-1');
      service.beginExecution(cancelledSeq, 'msg-1');
      service.cancelExecution(cancelledSeq);
      expect(service.endExecution(cancelledSeq)).toBe(true);

      const plainSeq = service.beginTurn('msg-2');
      service.beginExecution(plainSeq, 'msg-2');
      expect(service.endExecution(plainSeq)).toBe(false);
    });

    it('endExecution of an unknown sequence is a harmless no-op', () => {
      expect(service.endExecution(42)).toBe(false);
      expect(service.isExecuting()).toBe(false);
    });

    it('cancelRunningExecutions cancels every running execution and leaves later ones alone', () => {
      const seqA = service.beginTurn('msg-1');
      service.beginExecution(seqA, 'msg-1');
      const seqB = service.beginTurn('msg-2');
      service.beginExecution(seqB, 'msg-2');

      service.cancelRunningExecutions();

      expect(service.captureCancellation(seqA)()).toBe(true);
      expect(service.captureCancellation(seqB)()).toBe(true);
      expect(service.isExecuting()).toBe(false);

      const seqC = service.beginTurn('msg-3');
      service.beginExecution(seqC, 'msg-3');
      expect(service.captureCancellation(seqC)()).toBe(false);
      expect(service.isExecuting()).toBe(true);
    });

    it('cancelRunningExecutions without a running execution changes nothing', () => {
      const seq = service.beginTurn('msg-1');

      service.cancelRunningExecutions();

      expect(service.captureCancellation(seq)()).toBe(false);
      expect(service.isTurnRunning()).toBe(true);
    });

    it('leaves stop() behaviour untouched for a turn whose execution was cancelled', async () => {
      const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
      service.registerHooks(hooks);
      const seq = service.beginTurn('msg-1');
      service.beginExecution(seq, 'msg-1');
      service.cancelExecution(seq);

      await service.stop('user-button');

      expect(hooks.hardAbort).toHaveBeenCalledTimes(1);
      expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
        wasInterrupted: true,
        interruptedSummary: { executed: [] },
      });
    });
  });

  describe('turn_stopped confirmation', () => {
    function startStopWaiting() {
      service.beginTurn('msg-1');
      service.setTurnId('turn-1');
      const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => true };
      service.registerHooks(hooks);
      return { hooks, stopping: service.stop('user-button') };
    }

    it('shows the confirmed summary although done ended the turn in the same read as turn_stopped', async () => {
      const { hooks, stopping } = startStopWaiting();

      service.notifyTurnStopped('turn-1', ['create_client'], 1);
      service.endTurn();
      await stopping;

      expect(hooks.hardAbort).not.toHaveBeenCalled();
      expect(mockOrchestrator.updateMessage).toHaveBeenCalledTimes(1);
      expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
        wasInterrupted: true,
        interruptedSummary: { executed: ['create_client'] },
      });
    });

    it('writes the interruption notice once, when the confirmation is accepted', async () => {
      const { stopping } = startStopWaiting();

      service.notifyTurnStopped('turn-1', ['create_client'], 1);
      expect(mockOrchestrator.updateMessage).toHaveBeenCalledTimes(1);
      await stopping;

      expect(mockOrchestrator.updateMessage).toHaveBeenCalledTimes(1);
      expect(service.isTurnRunning()).toBe(false);
      expect(service.isStopping()).toBe(false);
    });

    it('reports an accepted event and does not hard-abort on it', async () => {
      const { hooks, stopping } = startStopWaiting();

      const accepted = service.notifyTurnStopped('turn-1', [], 0);
      await stopping;

      expect(accepted).toBe(true);
      expect(hooks.hardAbort).not.toHaveBeenCalled();
    });

    it('ignores a turn_stopped that names another turn and keeps waiting for the own one', async () => {
      const { hooks, stopping } = startStopWaiting();

      const accepted = service.notifyTurnStopped('turn-foreign', ['create_client'], 1);
      expect(accepted).toBe(false);
      expect(mockOrchestrator.updateMessage).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(TURN_STOP_GRACE_MS);
      await stopping;

      expect(hooks.hardAbort).toHaveBeenCalledOnce();
      expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
        wasInterrupted: true,
        interruptedSummary: null,
      });
    });

    it('ignores a turn_stopped without a turnId', async () => {
      const { hooks, stopping } = startStopWaiting();

      const accepted = service.notifyTurnStopped(null, [], 0);
      await vi.advanceTimersByTimeAsync(TURN_STOP_GRACE_MS);
      await stopping;

      expect(accepted).toBe(false);
      expect(hooks.hardAbort).toHaveBeenCalledOnce();
    });

    it('ignores a turn_stopped when no stop is waiting for it', () => {
      service.beginTurn('msg-1');
      service.setTurnId('turn-1');

      const accepted = service.notifyTurnStopped('turn-1', ['create_client'], 1);

      expect(accepted).toBe(false);
      expect(mockOrchestrator.updateMessage).not.toHaveBeenCalled();
      expect(service.isTurnRunning()).toBe(true);
    });

    it('ignores a late turn_stopped of an earlier turn once a newer turn has its own id', async () => {
      service.beginTurn('msg-a');
      service.setTurnId('turn-a');
      service.registerHooks({ silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false });
      const stopA = service.stop('user-button');
      service.beginTurn('msg-b');
      service.setTurnId('turn-b');
      await stopA;

      const accepted = service.notifyTurnStopped('turn-a', ['skill-a'], 1);

      expect(accepted).toBe(false);
      expect(mockOrchestrator.updateMessage).not.toHaveBeenCalled();
    });

    it('lists the labels when every executed action has one', async () => {
      const { stopping } = startStopWaiting();

      service.notifyTurnStopped('turn-1', ['a', 'b'], 2);
      await stopping;

      expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
        wasInterrupted: true,
        interruptedSummary: { executed: ['a', 'b'] },
      });
    });

    it('states that nothing was executed for zero labels and a zero count', async () => {
      const { stopping } = startStopWaiting();

      service.notifyTurnStopped('turn-1', [], 0);
      await stopping;

      expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
        wasInterrupted: true,
        interruptedSummary: { executed: [] },
      });
    });

    it('falls back to the cautious sentence when the count exceeds the labels', async () => {
      const { hooks, stopping } = startStopWaiting();

      service.notifyTurnStopped('turn-1', ['a'], 2);
      await stopping;

      expect(hooks.hardAbort).not.toHaveBeenCalled();
      expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
        wasInterrupted: true,
        interruptedSummary: null,
      });
    });

    it('falls back to the cautious sentence when an action ran but no label is available', async () => {
      const { hooks, stopping } = startStopWaiting();

      service.notifyTurnStopped('turn-1', [], 1);
      await stopping;

      expect(hooks.hardAbort).not.toHaveBeenCalled();
      expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
        wasInterrupted: true,
        interruptedSummary: null,
      });
    });

    it('trusts the labels when the server sends no count', async () => {
      const { stopping } = startStopWaiting();

      service.notifyTurnStopped('turn-1', ['a'], null);
      await stopping;

      expect(mockOrchestrator.updateMessage).toHaveBeenCalledWith('msg-1', {
        wasInterrupted: true,
        interruptedSummary: { executed: ['a'] },
      });
    });
  });

  describe('cancel request', () => {
    it('posts the cancel for the turnId of stream_start and keeps the full grace wait on a 404', async () => {
      service.beginTurn('msg-1');
      service.setTurnId('turn-1');
      mockAssistantService.cancelTurn.mockReturnValue(throwError(() => ({ status: 404 })));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
      service.registerHooks(hooks);

      const stopping = service.stop('user-button');
      await vi.advanceTimersByTimeAsync(TURN_STOP_GRACE_MS - 1);
      expect(hooks.hardAbort).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await stopping;

      expect(mockAssistantService.cancelTurn).toHaveBeenCalledTimes(1);
      expect(mockAssistantService.cancelTurn).toHaveBeenCalledWith('turn-1');
      expect(hooks.hardAbort).toHaveBeenCalledOnce();
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('logs an unexpected cancel failure but still accepts the turn_stopped confirmation', async () => {
      service.beginTurn('msg-1');
      service.setTurnId('turn-1');
      mockAssistantService.cancelTurn.mockReturnValue(throwError(() => ({ status: 500 })));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const hooks = { silence: vi.fn(), hardAbort: vi.fn(), hadToolSteps: () => false };
      service.registerHooks(hooks);

      const stopping = service.stop('user-button');
      await Promise.resolve();
      await Promise.resolve();
      service.notifyTurnStopped('turn-1', [], 0);
      await stopping;

      expect(warn).toHaveBeenCalled();
      expect(hooks.hardAbort).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
