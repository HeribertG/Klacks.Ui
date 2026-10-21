// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * View plumbing of one assistant chat instance: scroll-to-bottom requests the component consumes
 * after each render, change detection of the chat view, the deferred input focus and local
 * assistant messages Klacksy posts without a backend turn. Component-scoped, so the injected
 * ChangeDetectorRef is the chat component's own view.
 */
import { ChangeDetectorRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { formatMessage } from 'src/app/shared/helpers/assistant-text.helper';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { NavigationVerdictService } from './navigation-verdict.service';
import { createChatMessageId } from '../chat-ids.helper';

const FOCUS_DELAY_MS = 0;

@Injectable()
export class ChatTranscriptService {
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly cdr = inject(ChangeDetectorRef);
  private scrollRequested = true;
  private focusInput: () => void = () => undefined;

  constructor() {
    inject(NavigationVerdictService)
      .correctionAppended$.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.requestScrollToBottom();
        this.detectChanges();
      });
  }

  requestScrollToBottom(): void {
    this.scrollRequested = true;
  }

  /** Returns whether a scroll was requested since the last call and resets the request. */
  consumeScrollRequest(): boolean {
    const requested = this.scrollRequested;
    this.scrollRequested = false;
    return requested;
  }

  detectChanges(): void {
    this.cdr.detectChanges();
  }

  /**
   * @param focus - Focuses the chat input element; registered by the component that owns it
   */
  registerInputFocus(focus: () => void): void {
    this.focusInput = focus;
  }

  focusInputSoon(): void {
    setTimeout(() => this.focusInput(), FOCUS_DELAY_MS);
  }

  /**
   * Appends a Klacksy message that did not come from a streamed turn (tour stations, hints).
   * @param content - Already translated message text
   */
  postAssistantMessage(content: string): void {
    this.orchestrator.addMessage({
      id: createChatMessageId(),
      sender: 'assistant',
      content,
      formattedContent: formatMessage(content),
      timestamp: new Date(),
    });
    this.requestScrollToBottom();
    this.detectChanges();
  }
}
