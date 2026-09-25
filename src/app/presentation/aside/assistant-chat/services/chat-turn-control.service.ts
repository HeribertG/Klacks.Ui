// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Coordinates the single stop path for a running Klacksy turn (design doc
 * docs/superpowers/specs/2026-09-17-klacksy-stop-turn-design.md §4.1, §4.3). providedIn: 'root' for
 * the same reason as ChatStageStatusService: the voice bubble and chat-message bubble need the same
 * instance outside AssistantChatComponent's own tree, and that tree can be (re)constructed while
 * this singleton lives on - hooks are therefore replaced, not accumulated, on every registration.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';

export type TurnStopReason =
  | 'user-button'
  | 'voice-bubble'
  | 'barge-in'
  | 'session-end'
  | 'superseded'
  | 'panel-closed';

/** Milliseconds the UI waits for the backend's turn_stopped event before falling back to a hard local abort. */
export const TURN_STOP_GRACE_MS = 3000;

interface RunningExecution {
  messageId: string | null;
  cancelRequested: boolean;
}

export interface TurnHooks {
  /** Cheap, idempotent: mute TTS/auto-speak immediately, regardless of the eventual cooperative outcome. */
  silence: () => void;
  /** Full local cleanup: abort the fetch stream, drain buffers, clear stage status and the explain scroll queue. */
  hardAbort: () => void;
  /** Whether the current turn's tool-call steps had already started, for the cautious-sentence rule (§3.5). */
  hadToolSteps: () => boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatTurnControlService {
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly assistantService = inject(DataManagementAssistantService);

  private readonly _isTurnRunning = signal(false);
  readonly isTurnRunning = this._isTurnRunning.asReadonly();

  private readonly _isStopping = signal(false);
  readonly isStopping = this._isStopping.asReadonly();

  private turnId: string | null = null;
  private activeMessageId: string | null = null;
  private hooks: TurnHooks | null = null;
  private turnStoppedResolver: ((confirmed: boolean) => void) | null = null;
  private turnStoppedTimer: ReturnType<typeof setTimeout> | null = null;
  private turnEpoch = 0;
  private turnSeq = 0;
  private readonly stoppedSeqs = new Set<number>();
  private readonly _executions = signal<ReadonlyMap<number, RunningExecution>>(new Map());

  /**
   * True while a function-call execution (UI action steps, navigation) is running that the user can
   * still cancel. Independent of isTurnRunning: the execution starts with the stream's Metadata, right
   * before Done ends the turn, and outlives it. Turns false the moment cancelExecution() is requested,
   * although the step in flight still finishes.
   */
  readonly isExecuting = computed(() => {
    for (const execution of this._executions().values()) {
      if (!execution.cancelRequested) return true;
    }
    return false;
  });

  /**
   * Marks a new turn as running. Called once per sendMessage(), before the stream starts.
   * @param messageId - The assistant ChatMessage this turn is streaming into
   * @returns The sequence number identifying this turn, to be handed to captureCancellation()
   */
  beginTurn(messageId: string): number {
    this.turnEpoch++;
    this.turnSeq++;
    this.resolveTurnStoppedWait(false);
    this._isTurnRunning.set(true);
    this._isStopping.set(false);
    this.turnId = null;
    this.activeMessageId = messageId;
    return this.turnSeq;
  }

  /** Called from the stream_start SSE event once the backend assigns the turnId that the cancel endpoint and turn_stopped refer to. */
  setTurnId(turnId: string): void {
    this.turnId = turnId;
  }

  /**
   * Called when the turn finishes normally (done/error), so a later stray stop() finds nothing to do.
   * Bumping turnEpoch here means a stop() call still suspended waiting for turn_stopped when the turn
   * finishes normally sees an epoch mismatch on resuming and bails out cleanly - no interruption is
   * shown, which is correct: the turn genuinely completed, the stop merely arrived a moment too late.
   */
  endTurn(): void {
    this.turnEpoch++;
    this._isTurnRunning.set(false);
    this._isStopping.set(false);
    this.turnId = null;
    this.activeMessageId = null;
    this.resolveTurnStoppedWait(false);
  }

  /**
   * Returns a check answering "did the user stop THAT turn?" for the turn identified by seq, no
   * matter which turn is live when the check runs. It is deliberately neither "is the turn still
   * running" nor "is the current turn stopped": Metadata and Done arrive back to back, so a normally
   * finished turn has isTurnRunning() false while its function calls still execute, and a stop that
   * was confirmed by turn_stopped has already ended its turn when that turn's Metadata arrives. Only
   * stop() and, for a running execution, cancelExecution() mark a turn as stopped; endTurn() and the
   * start or stop of another turn never change the answer.
   * @param seq - The sequence number beginTurn() returned for the turn the check belongs to
   */
  captureCancellation(seq: number): () => boolean {
    return () => this.stoppedSeqs.has(seq);
  }

  /**
   * Whether the execution belonging to the given assistant message can still be cancelled. Reads a
   * signal, so templates and computeds calling it stay reactive.
   * @param messageId - The assistant ChatMessage whose function calls are being executed
   */
  isMessageExecuting(messageId: string): boolean {
    for (const execution of this._executions().values()) {
      if (execution.messageId === messageId && !execution.cancelRequested) return true;
    }
    return false;
  }

  /**
   * Registers a function-call execution as running, so it can be cancelled and shown. Not part of the
   * turn lifecycle: never touches isTurnRunning, the epoch or the hooks.
   * @param seq - The sequence number of the turn whose function calls run
   * @param messageId - The assistant ChatMessage the execution belongs to, if known
   */
  beginExecution(seq: number, messageId?: string): void {
    this.updateExecutions((executions) => {
      executions.set(seq, { messageId: messageId ?? null, cancelRequested: false });
    });
  }

  /**
   * Unregisters a function-call execution. Safe to call for an unknown sequence.
   * @param seq - The sequence number passed to beginExecution()
   * @returns Whether cancelExecution() had been requested for that execution
   */
  endExecution(seq: number): boolean {
    const execution = this._executions().get(seq);
    if (!execution) return false;
    this.updateExecutions((executions) => {
      executions.delete(seq);
    });
    return execution.cancelRequested;
  }

  /**
   * The second, narrower stop path: cancels only the function-call execution of one turn - the UI
   * action steps and navigations that run AFTER the turn's Done. It just marks the sequence as
   * stopped (what captureCancellation() polls), so the execution ends at its next step boundary and
   * the step in flight finishes regularly. No hooks, no endTurn(), no epoch change and no backend
   * cancel: the turn is over, only its client-side execution is not. Idempotent, and a sequence
   * without a running execution is left untouched, so a turn that still streams is never cancelled in advance.
   * @param seq - The sequence number of the turn whose execution should stop
   */
  cancelExecution(seq: number): void {
    const execution = this._executions().get(seq);
    if (!execution || execution.cancelRequested) return;
    this.stoppedSeqs.add(seq);
    this.updateExecutions((executions) => {
      executions.set(seq, { ...execution, cancelRequested: true });
    });
  }

  /**
   * Cancels every running execution, for the triggers that know no sequence number (voice bubble,
   * barge-in, session end, panel closed, a new message, the stop button of a finished message).
   */
  cancelRunningExecutions(): void {
    for (const seq of [...this._executions().keys()]) {
      this.cancelExecution(seq);
    }
  }

  /**
   * AssistantChatComponent calls this once from its constructor. A component-lifetime registration,
   * not per-turn: endTurn() must never clear it, because three of the six stop triggers (voice-bubble,
   * barge-in, session-end) fire from other components that have no hooks of their own.
   * @param hooks - The chat component's cleanup routines
   */
  registerHooks(hooks: TurnHooks): void {
    this.hooks = hooks;
  }

  /**
   * Handles the server's turn_stopped event for the stop this service is waiting on. The event is
   * accepted only while a stop() is suspended on it and only when it names this service's own turn:
   * a stale or foreign event changes nothing. The interruption notice is written to the message right
   * here, not when stop() resumes, because the server sends done straight after turn_stopped and both
   * usually arrive in one read: the stream callback for done ends the turn (epoch change) before the
   * suspended stop() continues, and that continuation then correctly bails out.
   * @param turnId - Id of the stopped turn as sent by the server; null when the event carried none
   * @param executedSkillLabels - User-language labels of the actions that really ran; may be shorter than executedCount
   * @param executedCount - Number of actions that really ran, including any without a label; null when the server sent none
   * @returns Whether the event was accepted as the confirmation of the pending stop
   */
  notifyTurnStopped(turnId: string | null, executedSkillLabels: string[], executedCount: number | null): boolean {
    if (this.turnStoppedResolver === null || turnId === null || turnId !== this.turnId) return false;
    const messageId = this.activeMessageId;
    if (messageId) {
      this.orchestrator.updateMessage(messageId, {
        wasInterrupted: true,
        interruptedSummary: this.summarizeExecuted(executedSkillLabels, executedCount ?? executedSkillLabels.length),
      });
    }
    this.resolveTurnStoppedWait(true);
    return true;
  }

  /**
   * The one stop path for all six triggers (§3.1). Flips isTurnRunning to false synchronously before
   * any await, both to satisfy "nothing new starts" (§3.3, polled by the UI action engine) and as the
   * reentrancy guard: a hook calling back into the orchestrator, which calls stop() again, sees
   * isTurnRunning already false and returns immediately.
   * @param reason - Which of the six triggers requested the stop
   */
  async stop(reason: TurnStopReason): Promise<void> {
    if (!this._isTurnRunning() || this._isStopping()) return;
    const epoch = this.turnEpoch;
    this.stoppedSeqs.add(this.turnSeq);
    this._isTurnRunning.set(false);
    this._isStopping.set(true);
    this.hooks?.silence();

    const messageId = this.activeMessageId;
    const tid = this.turnId;
    const waitsForServer = reason !== 'superseded' && reason !== 'panel-closed';

    if (tid) {
      firstValueFrom(this.assistantService.cancelTurn(tid)).catch((err: { status?: number }) => {
        if (err?.status !== 404) {
          console.warn('ChatTurnControlService: cancelTurn request failed unexpectedly', err);
        }
      });
    }

    const confirmed = tid && waitsForServer ? await this.waitForTurnStopped(TURN_STOP_GRACE_MS) : false;

    if (epoch !== this.turnEpoch) {
      // A newer turn already began and owns endTurn() duty now; touch nothing and let it be.
      return;
    }

    // A throwing hook (hardAbort in particular, since it drives real stream/DOM cleanup) must not
    // permanently wedge the service: without this, isStopping() would stay true forever, blocking
    // every future stop() via the reentrancy guard. finally guarantees endTurn() still runs, while
    // the exception itself still propagates to whoever is awaiting this stop() call.
    try {
      if (!confirmed) {
        const hadToolSteps = this.hooks?.hadToolSteps() ?? false;
        this.hooks?.hardAbort();
        if (messageId) {
          this.orchestrator.updateMessage(messageId, {
            wasInterrupted: true,
            interruptedSummary: hadToolSteps ? null : { executed: [] },
          });
        }
      }
    } finally {
      this.endTurn();
    }
  }

  private waitForTurnStopped(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.turnStoppedResolver = resolve;
      this.turnStoppedTimer = setTimeout(() => this.resolveTurnStoppedWait(false), timeoutMs);
    });
  }

  private summarizeExecuted(labels: string[], executedCount: number): { executed: string[] } | null {
    return executedCount > labels.length ? null : { executed: labels };
  }

  /**
   * The single funnel through which a pending wait can ever settle - by server notification or by
   * timeout - so the timer for one turn's wait can never act on a later turn's still-live resolver.
   * @param confirmed - True when the server confirmed the stop, false on a local timeout or when the turn ended otherwise
   */
  private resolveTurnStoppedWait(confirmed: boolean): void {
    if (this.turnStoppedTimer !== null) {
      clearTimeout(this.turnStoppedTimer);
      this.turnStoppedTimer = null;
    }
    const resolver = this.turnStoppedResolver;
    this.turnStoppedResolver = null;
    resolver?.(confirmed);
  }

  private updateExecutions(mutate: (executions: Map<number, RunningExecution>) => void): void {
    this._executions.update((current) => {
      const next = new Map(current);
      mutate(next);
      return next;
    });
  }
}
