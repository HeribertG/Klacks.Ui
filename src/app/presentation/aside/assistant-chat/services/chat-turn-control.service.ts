// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Coordinates the single stop path for a running Klacksy turn (design doc
 * docs/superpowers/specs/2026-09-17-klacksy-stop-turn-design.md §4.1, §4.3). providedIn: 'root' for
 * the same reason as ChatStageStatusService: the voice bubble and chat-message bubble need the same
 * instance outside AssistantChatComponent's own tree, and that tree can be (re)constructed while
 * this singleton lives on - hooks are therefore replaced, not accumulated, on every registration.
 */
import { Injectable, inject, signal } from '@angular/core';
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
  private turnStoppedResolver: ((labels: string[] | null) => void) | null = null;
  private turnStoppedTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Marks a new turn as running. Called once per sendMessage(), before the stream starts.
   * @param messageId - The assistant ChatMessage this turn is streaming into
   */
  beginTurn(messageId: string): void {
    this._isTurnRunning.set(true);
    this._isStopping.set(false);
    this.turnId = null;
    this.activeMessageId = messageId;
  }

  /** Called from the stream_start SSE event once the backend assigns a turnId (absent until Etappe 2 ships). */
  setTurnId(turnId: string): void {
    this.turnId = turnId;
  }

  /** Called when the turn finishes normally (done/error), so a later stray stop() finds nothing to do. */
  endTurn(): void {
    this._isTurnRunning.set(false);
    this._isStopping.set(false);
    this.turnId = null;
    this.activeMessageId = null;
    if (this.turnStoppedTimer !== null) {
      clearTimeout(this.turnStoppedTimer);
      this.turnStoppedTimer = null;
    }
    this.turnStoppedResolver = null;
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

  /** Resolves a pending stop()'s wait for the server's turn_stopped SSE event (Etappe 2). */
  notifyTurnStopped(executedSkillLabels: string[]): void {
    this.resolveTurnStoppedWait(executedSkillLabels);
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

    const summary = tid && waitsForServer ? await this.waitForTurnStopped(TURN_STOP_GRACE_MS) : null;

    if (summary !== null) {
      if (messageId) {
        this.orchestrator.updateMessage(messageId, {
          wasInterrupted: true,
          interruptedSummary: { executed: summary },
        });
      }
    } else {
      this.hooks?.hardAbort();
      if (messageId) {
        const hadToolSteps = this.hooks?.hadToolSteps() ?? false;
        this.orchestrator.updateMessage(messageId, {
          wasInterrupted: true,
          interruptedSummary: hadToolSteps ? null : { executed: [] },
        });
      }
    }

    this.endTurn();
  }

  private waitForTurnStopped(timeoutMs: number): Promise<string[] | null> {
    return new Promise((resolve) => {
      this.turnStoppedResolver = resolve;
      this.turnStoppedTimer = setTimeout(() => this.resolveTurnStoppedWait(null), timeoutMs);
    });
  }

  /**
   * The single funnel through which a pending wait can ever settle - by server notification or by
   * timeout - so the timer for one turn's wait can never act on a later turn's still-live resolver.
   * @param labels - Executed skill labels from the server, or null on a local timeout
   */
  private resolveTurnStoppedWait(labels: string[] | null): void {
    if (this.turnStoppedTimer !== null) {
      clearTimeout(this.turnStoppedTimer);
      this.turnStoppedTimer = null;
    }
    const resolver = this.turnStoppedResolver;
    this.turnStoppedResolver = null;
    resolver?.(labels);
  }
}
