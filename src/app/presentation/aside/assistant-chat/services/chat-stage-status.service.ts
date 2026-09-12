// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tracks the "still working" state of the one assistant message currently streaming: the backend
 * processing stage reported by the SSE `status` event (shown while the message has no content yet)
 * and the tool-call steps reported by `function_call`/`function_result` (shown whenever a tool runs,
 * even after prose already started). Extracted out of AssistantChatComponent, which both this
 * service and ChatMessageComponent inject, because that component is already far past the
 * Controller-Extraction-Pattern size threshold. providedIn: 'root' because app-chat-message has a
 * second host besides assistant-chat.component.html (assistant-panels.component.html, for the
 * proactive-inbox rows) — a component-scoped provider on AssistantChatComponent would leave that
 * second tree without an injectable instance (NG0201).
 */
import { Injectable, computed, signal } from '@angular/core';
import { ASSISTANT_STATUS_STAGE, AssistantStatusStage } from 'src/app/domain/constants/assistant-status-stage.constants';
import { ToolStep } from '../tool-step.interface';

const TOOL_STATUS_PREFIX = 'assistant-chat.tool-status.';
const STAGE_KEY_PREFIX = 'assistant-chat.stage.';
const FALLBACK_STAGE_KEY = `${TOOL_STATUS_PREFIX}working`;

@Injectable({ providedIn: 'root' })
export class ChatStageStatusService {
  private readonly _activeMessageId = signal<string | null>(null);
  private readonly _stage = signal<AssistantStatusStage>(ASSISTANT_STATUS_STAGE.Unknown);
  private readonly _toolSteps = signal<readonly ToolStep[]>([]);

  readonly activeMessageId = this._activeMessageId.asReadonly();
  readonly stage = this._stage.asReadonly();
  readonly toolSteps = this._toolSteps.asReadonly();

  readonly stageLabelKey = computed(() =>
    this._stage() === ASSISTANT_STATUS_STAGE.Unknown ? FALLBACK_STAGE_KEY : `${STAGE_KEY_PREFIX}${this._stage()}`,
  );

  /**
   * Marks a freshly created assistant message as the one this service tracks; called once, right
   * when the empty streaming ChatMessage is added.
   * @param messageId - Id of the assistant message about to stream
   */
  startMessage(messageId: string): void {
    this._activeMessageId.set(messageId);
    this._stage.set(ASSISTANT_STATUS_STAGE.Unknown);
    this._toolSteps.set([]);
  }

  isActiveMessage(messageId: string): boolean {
    return this._activeMessageId() === messageId;
  }

  applyStatus(stage: AssistantStatusStage): void {
    if (this._activeMessageId() === null) return;
    this._stage.set(stage);
  }

  addToolStep(functionName: string): void {
    this._toolSteps.update((steps) => [
      ...steps,
      { functionName, key: this.toolStatusKey(functionName), done: false },
    ]);
  }

  markToolStepDone(functionName: string): void {
    this._toolSteps.update((steps) => {
      let idx = steps.findIndex((s) => !s.done && s.functionName === functionName);
      if (idx < 0) {
        idx = steps.findIndex((s) => !s.done);
      }
      if (idx < 0) return steps;
      const next = steps.slice();
      next[idx] = { ...next[idx], done: true };
      return next;
    });
  }

  /**
   * Resets stage and tool steps once real content starts streaming, without releasing ownership of
   * the message: a later multi-turn iteration can still call more tools after prose already showed,
   * and those steps must render against the same messageId again. Called once per streamed content
   * chunk (dozens per second), so both writes are guarded — an unconditional `.set([])` would
   * allocate a new array and notify every ChatMessageComponent on every token even when there is
   * nothing to reset.
   */
  onContentStarted(): void {
    if (this._stage() !== ASSISTANT_STATUS_STAGE.Unknown) {
      this._stage.set(ASSISTANT_STATUS_STAGE.Unknown);
    }
    if (this._toolSteps().length > 0) {
      this._toolSteps.set([]);
    }
  }

  /** Full reset once the message's turn is truly over (done/error/metadata/interrupt/clear-chat). */
  clear(): void {
    this._activeMessageId.set(null);
    this._stage.set(ASSISTANT_STATUS_STAGE.Unknown);
    this._toolSteps.set([]);
  }

  private toolStatusKey(functionName: string): string {
    const name = (functionName || '').toLowerCase();
    let category = 'working';
    if (name.startsWith('search') || name.startsWith('list') || name.startsWith('find') || name.startsWith('get') || name.includes('web_search')) {
      category = 'searching';
    } else if (name.startsWith('create') || name.startsWith('add')) {
      category = 'creating';
    } else if (name.startsWith('update') || name.startsWith('assign') || name.startsWith('remove') || name.startsWith('set') || name.startsWith('delete')) {
      category = 'updating';
    } else if (name.startsWith('navigate') || name.startsWith('open') || name.includes('navigate')) {
      category = 'navigating';
    }
    return TOOL_STATUS_PREFIX + category;
  }
}
