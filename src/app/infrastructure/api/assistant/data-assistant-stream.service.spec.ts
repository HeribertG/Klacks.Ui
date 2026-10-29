// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { DataAssistantStreamService } from './data-assistant-stream.service';
import { StreamCallbacks } from '../../../domain/models/assistant/stream-callbacks.interface';
import { StreamStatus } from '../../../domain/models/assistant/stream-status.interface';
import { IAssistantChatRequest } from '../../../domain/models/assistant/assistant-chat-request.interface';
import { ASSISTANT_STATUS_STAGE } from 'src/app/domain/constants/assistant-status-stage.constants';
import {
  PLAYGROUND_DEVICE_HEADER,
  PLAYGROUND_FEATURE_BLOCKED_ERROR_CODE,
  PLAYGROUND_PROMPT_TOO_LONG_ERROR_CODE,
  PLAYGROUND_TOKEN_LIMIT_ERROR_CODE,
} from 'src/app/domain/constants/playground.constants';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { INSTANCE_ID_HEADER } from 'src/app/domain/helpers/instance-id.helper';

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

  it('passes turnId from stream_start when the backend sends one', async () => {
    mockFetchWithEvents([{ event: 'stream_start', data: { conversationId: 'conv-1', turnId: 'turn-1' } }]);
    const onStreamStart = vi.fn();
    const callbacks: StreamCallbacks = { onStreamStart };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(onStreamStart).toHaveBeenCalled();
    });
    expect(onStreamStart).toHaveBeenCalledWith('conv-1', 'turn-1');
  });

  it('passes null turnId from stream_start when the backend omits it (Etappe 2 not deployed yet)', async () => {
    mockFetchWithEvents([{ event: 'stream_start', data: { conversationId: 'conv-1' } }]);
    const onStreamStart = vi.fn();
    const callbacks: StreamCallbacks = { onStreamStart };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(onStreamStart).toHaveBeenCalled();
    });
    expect(onStreamStart).toHaveBeenCalledWith('conv-1', null);
  });

  it('dispatches turn_stopped with the turnId, the executed skill labels and the executed count', async () => {
    mockFetchWithEvents([
      { event: 'turn_stopped', data: { turnId: 'turn-1', executedSkillLabels: ['create_client'], executedCount: 2 } },
    ]);
    const onTurnStopped = vi.fn();
    const callbacks: StreamCallbacks = { onTurnStopped };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(onTurnStopped).toHaveBeenCalled();
    });
    expect(onTurnStopped).toHaveBeenCalledWith('turn-1', ['create_client'], 2);
  });

  it('defaults turn_stopped to no turnId, no labels and no count when the payload omits them', async () => {
    mockFetchWithEvents([{ event: 'turn_stopped', data: {} }]);
    const onTurnStopped = vi.fn();
    const callbacks: StreamCallbacks = { onTurnStopped };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(onTurnStopped).toHaveBeenCalled();
    });
    expect(onTurnStopped).toHaveBeenCalledWith(null, [], null);
  });

  it('ignores a non-string turnId, non-string labels and a non-numeric count in turn_stopped', async () => {
    mockFetchWithEvents([
      { event: 'turn_stopped', data: { turnId: 7, executedSkillLabels: ['a', 3, null, 'b'], executedCount: '2' } },
    ]);
    const onTurnStopped = vi.fn();
    const callbacks: StreamCallbacks = { onTurnStopped };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(onTurnStopped).toHaveBeenCalled();
    });
    expect(onTurnStopped).toHaveBeenCalledWith(null, ['a', 'b'], null);
  });

  it('keeps the stream open after turn_stopped so that the trailing done still arrives', async () => {
    mockFetchWithEvents([
      { event: 'turn_stopped', data: { turnId: 'turn-1', executedSkillLabels: [], executedCount: 0 } },
      { event: 'done', data: {} },
    ]);
    const order: string[] = [];
    const callbacks: StreamCallbacks = {
      onTurnStopped: () => order.push('turn_stopped'),
      onDone: () => order.push('done'),
    };

    service.chatStream(request, callbacks);

    await vi.waitFor(() => {
      expect(order).toEqual(['turn_stopped', 'done']);
    });
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

  describe('tab instance id', () => {
    const INSTANCE_ID = 'tab-instance-1';

    const sentHeaders = (): Record<string, string> => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      return fetchMock.mock.calls[0][1].headers;
    };

    afterEach(() => {
      vi.restoreAllMocks();
      sessionStorage.removeItem(StorageKeys.CONTAINER_LOCK_INSTANCE_ID);
    });

    it('sends the tab instance id so a skill shares the lock of the open container page', async () => {
      // Arrange
      sessionStorage.setItem(StorageKeys.CONTAINER_LOCK_INSTANCE_ID, INSTANCE_ID);
      mockFetchWithEvents([{ event: 'done', data: {} }]);
      const done: boolean[] = [];

      // Act
      service.chatStream(request, { onDone: () => done.push(true) });
      await vi.waitFor(() => expect(done.length).toBe(1));

      // Assert
      expect(sentHeaders()[INSTANCE_ID_HEADER]).toBe(INSTANCE_ID);
    });

    it('sends no instance id and creates none while the tab has none', async () => {
      // Arrange
      mockFetchWithEvents([{ event: 'done', data: {} }]);
      const done: boolean[] = [];

      // Act
      service.chatStream(request, { onDone: () => done.push(true) });
      await vi.waitFor(() => expect(done.length).toBe(1));

      // Assert
      expect(INSTANCE_ID_HEADER in sentHeaders()).toBe(false);
      expect(sessionStorage.getItem(StorageKeys.CONTAINER_LOCK_INSTANCE_ID)).toBeNull();
    });
  });

  describe('playground token limit', () => {
    const DEVICE_TOKEN = 'signedDeviceToken1234567890';
    const LIMIT_PROBLEM = { status: 429, errorCode: PLAYGROUND_TOKEN_LIMIT_ERROR_CODE };

    const sentHeaders = (): Record<string, string> => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      return fetchMock.mock.calls[0][1].headers;
    };

    afterEach(() => {
      vi.restoreAllMocks();
      localStorage.removeItem(StorageKeys.PLAYGROUND_DEVICE_TOKEN);
    });

    it('sends no device header and writes nothing to storage while the limit is inactive', async () => {
      // Arrange
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      mockFetchWithEvents([{ event: 'done', data: {} }]);
      const done: boolean[] = [];

      // Act
      service.chatStream(request, { onDone: () => done.push(true) });
      await vi.waitFor(() => expect(done.length).toBe(1));

      // Assert
      expect(PLAYGROUND_DEVICE_HEADER in sentHeaders()).toBe(false);
      expect(setItem).not.toHaveBeenCalled();
    });

    it('sends the device header on the fetch path while the limit is active', async () => {
      // Arrange
      TestBed.inject(PlaygroundDeviceService).applyStatus({ limitActive: true, deviceToken: DEVICE_TOKEN });
      mockFetchWithEvents([{ event: 'done', data: {} }]);
      const done: boolean[] = [];

      // Act
      service.chatStream(request, { onDone: () => done.push(true) });
      await vi.waitFor(() => expect(done.length).toBe(1));

      // Assert
      expect(sentHeaders()[PLAYGROUND_DEVICE_HEADER]).toBe(DEVICE_TOKEN);
    });

    it('reports the limit code of a 429 problem before the stream starts', async () => {
      // Arrange
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: () => Promise.resolve(LIMIT_PROBLEM),
        } as unknown as Response),
      );
      const errors: (string | undefined)[] = [];

      // Act
      service.chatStream(request, { onError: (_message, code) => errors.push(code) });
      await vi.waitFor(() => expect(errors.length).toBe(1));

      // Assert
      expect(errors[0]).toBe(PLAYGROUND_TOKEN_LIMIT_ERROR_CODE);
    });

    it.each([
      { status: 403, errorCode: PLAYGROUND_FEATURE_BLOCKED_ERROR_CODE },
      { status: 400, errorCode: PLAYGROUND_PROMPT_TOO_LONG_ERROR_CODE },
    ])('reports the $errorCode of a $status problem before the stream starts', async ({ status, errorCode }) => {
      // Arrange
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status,
          statusText: 'Rejected',
          json: () => Promise.resolve({ status, errorCode }),
        } as unknown as Response),
      );
      const errors: (string | undefined)[] = [];

      // Act
      service.chatStream(request, { onError: (_message, code) => errors.push(code) });
      await vi.waitFor(() => expect(errors.length).toBe(1));

      // Assert
      expect(errors[0]).toBe(errorCode);
    });

    it('reports no code when the status does not belong to the playground code', async () => {
      // Arrange
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Server Error',
          json: () => Promise.resolve({ status: 500, errorCode: PLAYGROUND_FEATURE_BLOCKED_ERROR_CODE }),
        } as unknown as Response),
      );
      const errors: (string | undefined)[] = [];

      // Act
      service.chatStream(request, { onError: (_message, code) => errors.push(code) });
      await vi.waitFor(() => expect(errors.length).toBe(1));

      // Assert
      expect(errors[0]).toBeUndefined();
    });

    it('reports no code for a 429 whose body carries none', async () => {
      // Arrange
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: () => Promise.resolve({ status: 429 }),
        } as unknown as Response),
      );
      const errors: (string | undefined)[] = [];

      // Act
      service.chatStream(request, { onError: (_message, code) => errors.push(code) });
      await vi.waitFor(() => expect(errors.length).toBe(1));

      // Assert
      expect(errors[0]).toBeUndefined();
    });

    it('forwards the limit code of an SSE error chunk sent mid-turn', async () => {
      // Arrange
      mockFetchWithEvents([
        { event: 'error', data: { errorMessage: 'limit', errorCode: PLAYGROUND_TOKEN_LIMIT_ERROR_CODE } },
      ]);
      const errors: (string | undefined)[] = [];

      // Act
      service.chatStream(request, { onError: (_message, code) => errors.push(code) });
      await vi.waitFor(() => expect(errors.length).toBe(1));

      // Assert
      expect(errors[0]).toBe(PLAYGROUND_TOKEN_LIMIT_ERROR_CODE);
    });
  });
});
