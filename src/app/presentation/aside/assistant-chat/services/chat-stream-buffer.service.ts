// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Frame-batched rendering of the streamed answer of one assistant chat instance: buffers content
 * chunks, flushes them once per animation frame into the streaming message, fires the in-page scroll
 * of every completed [SCROLL:target] marker and feeds the new clean text to the sentence-wise speech.
 * @param assistantMessageId - The streaming assistant message the buffered text belongs to
 * @param isStopped - Whether the current turn was stopped; stopped text is no longer spoken
 */
import { Injectable, NgZone, inject } from '@angular/core';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { formatMessage, stripForTts, stripMetadataMarkers } from 'src/app/shared/helpers/assistant-text.helper';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { ChatTranscriptService } from './chat-transcript.service';

const SCROLL_MARKER_REGEX = /\[SCROLL:\s*([\w-]+)\s*\]/gi;

@Injectable()
export class ChatStreamBufferService {
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly klacksyNavigation = inject(KlacksyNavigationService);
  private readonly transcript = inject(ChatTranscriptService);
  private readonly ngZone = inject(NgZone);

  private rawStream = '';
  private buffer = '';
  private rafHandle: number | null = null;
  private previousClean = '';
  private scrollMarkersDispatched = 0;
  private isTurnStopped: () => boolean = () => false;

  /**
   * Starts a new turn: empties the buffers and cancels a frame still pending from the previous turn.
   * @param isStopped - Stop check of the new turn
   */
  begin(isStopped: () => boolean): void {
    this.isTurnStopped = isStopped;
    this.clear();
    this.cancelFrame();
  }

  /**
   * @param assistantMessageId - The streaming assistant message
   * @param text - Content chunk as it came off the stream
   */
  append(assistantMessageId: string, text: string): void {
    this.buffer += text;
    if (this.rafHandle !== null) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.ngZone.run(() => this.flush(assistantMessageId));
    });
  }

  /** Renders whatever is still buffered right now, instead of on the next frame. */
  drain(assistantMessageId: string): void {
    this.cancelFrame();
    if (this.buffer) {
      this.flush(assistantMessageId);
    }
  }

  /** Forgets the streamed text without touching a pending frame (a later flush finds nothing). */
  clear(): void {
    this.buffer = '';
    this.previousClean = '';
    this.rawStream = '';
    this.scrollMarkersDispatched = 0;
  }

  cancelFrame(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  private flush(assistantMessageId: string): void {
    this.rafHandle = null;
    if (!this.buffer) return;

    const delta = this.buffer;
    this.buffer = '';
    this.rawStream += delta;
    this.dispatchScrollMarkers(this.rawStream);
    const nextContent = stripMetadataMarkers(this.rawStream);
    const previousClean = this.previousClean;

    this.orchestrator.updateMessage(assistantMessageId, {
      content: nextContent,
      formattedContent: formatMessage(nextContent),
      isStreaming: true,
    });
    this.transcript.requestScrollToBottom();

    const ttsDelta =
      nextContent.length > previousClean.length && nextContent.startsWith(previousClean)
        ? nextContent.substring(previousClean.length)
        : '';
    this.previousClean = nextContent;

    const ttsClean = stripForTts(ttsDelta);
    if (ttsClean && !this.isTurnStopped()) {
      this.orchestrator.onStreamContent(ttsClean);
    }
  }

  /**
   * Counting dispatched matches (instead of remembering target ids) keeps a repeated target late in
   * the answer working, e.g. when the model returns to a section.
   */
  private dispatchScrollMarkers(rawStream: string): void {
    const matches = [...rawStream.matchAll(SCROLL_MARKER_REGEX)];
    for (let i = this.scrollMarkersDispatched; i < matches.length; i++) {
      this.klacksyNavigation.queueExplainScroll(matches[i][1]);
    }
    this.scrollMarkersDispatched = matches.length;
  }
}
