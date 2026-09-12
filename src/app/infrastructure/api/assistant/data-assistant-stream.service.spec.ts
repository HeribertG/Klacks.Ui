// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { DataAssistantStreamService, StreamCallbacks, StreamStatus } from './data-assistant-stream.service';
import { IAssistantChatRequest } from './data-assistant.service';
import { ASSISTANT_STATUS_STAGE } from 'src/app/domain/constants/assistant-status-stage.constants';

function sseStreamFromEvents(events: readonly { event: string; data: unknown }[]): ReadableStream<Uint8Array> {
  const text = events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join('');
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe('DataAssistantStreamService', () => {
  let service: DataAssistantStreamService;
  const request: IAssistantChatRequest = { message: 'hi' };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataAssistantStreamService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetchWithEvents(events: readonly { event: string; data: unknown }[]): void {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: sseStreamFromEvents(events),
      } as unknown as Response),
    );
  }

  it('normalizes a known stage and forwards elapsedMs', async () => {
    mockFetchWithEvents([{ event: 'status', data: { stage: 'calling_model', elapsedMs: 1200 } }]);
    const received: StreamStatus[] = [];
    const callbacks: StreamCallbacks = { onStatus: (data) => received.push(data) };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(received.length).toBe(1);
    });
    expect(received[0]).toEqual({ stage: ASSISTANT_STATUS_STAGE.CallingModel, elapsedMs: 1200 });
  });

  it('maps an unrecognized stage key to the Unknown fallback instead of forwarding it raw', async () => {
    mockFetchWithEvents([{ event: 'status', data: { stage: 'some_future_stage', elapsedMs: 300 } }]);
    const received: StreamStatus[] = [];
    const callbacks: StreamCallbacks = { onStatus: (data) => received.push(data) };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(received.length).toBe(1);
    });
    expect(received[0].stage).toBe(ASSISTANT_STATUS_STAGE.Unknown);
  });

  it('defaults elapsedMs to null when the payload omits it', async () => {
    mockFetchWithEvents([{ event: 'status', data: { stage: 'preparing_context' } }]);
    const received: StreamStatus[] = [];
    const callbacks: StreamCallbacks = { onStatus: (data) => received.push(data) };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(received.length).toBe(1);
    });
    expect(received[0]).toEqual({ stage: ASSISTANT_STATUS_STAGE.PreparingContext, elapsedMs: null });
  });

  it('does not invoke onStatus for other event types', async () => {
    mockFetchWithEvents([{ event: 'content', data: { text: 'hello' } }]);
    const onStatus = vi.fn();
    const onContent = vi.fn();
    const callbacks: StreamCallbacks = { onStatus, onContent };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(onContent).toHaveBeenCalledWith('hello');
    });
    expect(onStatus).not.toHaveBeenCalled();
  });

  it('forwards elapsedMs: 0 as 0, not as absent/null (the first status event is a legitimate 0)', async () => {
    mockFetchWithEvents([{ event: 'status', data: { stage: 'assembling_toolset', elapsedMs: 0 } }]);
    const received: StreamStatus[] = [];
    const callbacks: StreamCallbacks = { onStatus: (data) => received.push(data) };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(received.length).toBe(1);
    });
    expect(received[0].elapsedMs).toBe(0);
  });

  it('parses the 1-based iteration field present on calling_model/executing_tool', async () => {
    mockFetchWithEvents([{ event: 'status', data: { stage: 'calling_model', elapsedMs: 900, iteration: 2 } }]);
    const received: StreamStatus[] = [];
    const callbacks: StreamCallbacks = { onStatus: (data) => received.push(data) };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(received.length).toBe(1);
    });
    expect(received[0].iteration).toBe(2);
  });

  it('leaves iteration undefined for stages that never carry it', async () => {
    mockFetchWithEvents([{ event: 'status', data: { stage: 'resolving_recipe', elapsedMs: 50 } }]);
    const received: StreamStatus[] = [];
    const callbacks: StreamCallbacks = { onStatus: (data) => received.push(data) };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(received.length).toBe(1);
    });
    expect(received[0].iteration).toBeUndefined();
  });

  it('dispatches multiple status events that arrive before stream_start, in wire order', async () => {
    // Real turn shape: assembling_toolset and preparing_context precede stream_start; resolving_recipe
    // and calling_model(iteration=1) follow it, before any content. Nothing here should let the
    // frontend treat stream_start as "the" message-start signal for status tracking purposes.
    mockFetchWithEvents([
      { event: 'status', data: { stage: 'assembling_toolset', elapsedMs: 5 } },
      { event: 'status', data: { stage: 'preparing_context', elapsedMs: 40 } },
      { event: 'stream_start', data: { conversationId: 'conv-1' } },
      { event: 'status', data: { stage: 'resolving_recipe', elapsedMs: 120 } },
      { event: 'status', data: { stage: 'calling_model', elapsedMs: 200, iteration: 1 } },
      { event: 'content', data: { text: 'Hallo' } },
    ]);
    const events: string[] = [];
    const callbacks: StreamCallbacks = {
      onStatus: (data) => events.push(`status:${data.stage}`),
      onStreamStart: () => events.push('stream_start'),
      onContent: () => events.push('content'),
    };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(events.length).toBe(6);
    });
    expect(events).toEqual([
      'status:assembling_toolset',
      'status:preparing_context',
      'stream_start',
      'status:resolving_recipe',
      'status:calling_model',
      'content',
    ]);
  });
});
