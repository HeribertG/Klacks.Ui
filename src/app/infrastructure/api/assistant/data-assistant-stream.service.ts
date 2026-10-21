// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * SSE streaming service for LLM chat using native fetch API.
 * Handles Server-Sent Events parsing and dispatches typed callbacks.
 * @param baseUrl - Backend assistant API URL from environment configuration
 */

import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { IAssistantChatRequest } from '../../../domain/models/assistant/assistant-chat-request.interface';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { StreamCallbacks } from '../../../domain/models/assistant/stream-callbacks.interface';
import { StreamMetadata } from '../../../domain/models/assistant/stream-metadata.interface';
import { SseEvent } from '../../../domain/models/assistant/sse-event.interface';
import { toAssistantStatusStage } from 'src/app/domain/constants/assistant-status-stage.constants';

@Injectable({ providedIn: 'root' })
export class DataAssistantStreamService {
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  chatStream(request: IAssistantChatRequest, callbacks: StreamCallbacks): AbortController {
    const controller = new AbortController();
    this.doStream(request, callbacks, controller.signal);
    return controller;
  }

  private async doStream(
    request: IAssistantChatRequest,
    callbacks: StreamCallbacks,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      const token = localStorage.getItem(StorageKeys.TOKEN);

      const response = await fetch(`${this.baseUrl}chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
        signal,
      });

      if (!response.ok) {
        callbacks.onError?.(`HTTP ${response.status}: ${response.statusText}`);
        return;
      }

      if (!response.body) {
        callbacks.onError?.('No response body');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const { parsed, remaining } = this.parseSSEBuffer(buffer);
        buffer = remaining;

        for (const event of parsed) {
          this.dispatchEvent(event, callbacks);
        }
      }

      if (buffer.trim()) {
        const { parsed } = this.parseSSEBuffer(buffer + '\n\n');
        for (const event of parsed) {
          this.dispatchEvent(event, callbacks);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      callbacks.onError?.(err instanceof Error ? err.message : 'Stream failed');
    }
  }

  private parseSSEBuffer(buffer: string): { parsed: SseEvent[]; remaining: string } {
    const events: SseEvent[] = [];
    const parts = buffer.split('\n\n');
    const remaining = parts.pop() ?? '';

    for (const part of parts) {
      if (!part.trim()) continue;

      let eventType = '';
      let data = '';

      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          data += line.slice(6);
        }
      }

      if (eventType && data) {
        try {
          events.push({ type: eventType, data: JSON.parse(data) });
        } catch {
          // skip malformed JSON
        }
      }
    }

    return { parsed: events, remaining };
  }

  private dispatchEvent(event: SseEvent, callbacks: StreamCallbacks): void {
    const data = event.data;
    switch (event.type) {
      case 'stream_start':
        callbacks.onStreamStart?.(
          data['conversationId'] as string,
          typeof data['turnId'] === 'string' ? (data['turnId'] as string) : null,
        );
        break;
      case 'status':
        callbacks.onStatus?.({
          stage: toAssistantStatusStage(data['stage'] as string | undefined),
          // The backend omits elapsedMs/iteration rather than sending null, and 0 is a valid
          // elapsedMs on the very first event - checked via typeof, never a truthiness check.
          elapsedMs: typeof data['elapsedMs'] === 'number' ? data['elapsedMs'] : null,
          iteration: typeof data['iteration'] === 'number' ? data['iteration'] : undefined,
        });
        break;
      case 'content':
        callbacks.onContent?.(data['text'] as string);
        break;
      case 'function_call':
        callbacks.onFunctionCall?.(data as { functionName: string; parameters: Record<string, unknown> });
        break;
      case 'function_result':
        callbacks.onFunctionResult?.(data as { functionName: string; functionResult: string; executionType: string; uiActionSteps?: string; uiActionTrackingId?: string });
        break;
      case 'metadata':
        callbacks.onMetadata?.(data as StreamMetadata);
        break;
      case 'turn_stopped':
        callbacks.onTurnStopped?.(
          typeof data['turnId'] === 'string' ? data['turnId'] : null,
          Array.isArray(data['executedSkillLabels'])
            ? data['executedSkillLabels'].filter((label): label is string => typeof label === 'string')
            : [],
          typeof data['executedCount'] === 'number' ? data['executedCount'] : null,
        );
        break;
      case 'done':
        callbacks.onDone?.();
        break;
      case 'error':
        callbacks.onError?.((data['errorMessage'] as string) || 'Unknown error');
        break;
    }
  }
}
