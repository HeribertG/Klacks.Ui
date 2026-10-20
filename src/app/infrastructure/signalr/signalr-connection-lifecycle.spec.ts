// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import type { Mock } from 'vitest';
import * as signalR from '@microsoft/signalr';
import { SignalRConnectionHelper, SignalRConnectionCallbacks } from './signalr-connection.helper';
import { SignalRTokenHelper } from './signalr-token.helper';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageKeys } from '../constants/storage-keys';

const createdHubs: FakeHub[] = [];

class FakeHub {
  state = 'Disconnected';
  serverTimeoutInMilliseconds = 0;
  keepAliveIntervalInMilliseconds = 0;
  private readonly closedCallbacks: ((error?: Error) => void)[] = [];

  start = vi.fn(async () => {
    this.state = 'Connected';
  });

  invoke = vi.fn(async () => `connection-${createdHubs.indexOf(this)}`);

  stop = vi.fn(async () => {
    this.state = 'Disconnected';
    this.fireClose();
  });

  onreconnecting(): void {}
  onreconnected(): void {}

  onclose(callback: (error?: Error) => void): void {
    this.closedCallbacks.push(callback);
  }

  fireClose(error?: Error): void {
    this.closedCallbacks.forEach((callback) => callback(error));
  }
}

describe('SignalRConnectionHelper - deliberate stop versus real close', () => {
  let helper: SignalRConnectionHelper;
  let callbacks: SignalRConnectionCallbacks;
  let onClosed: Mock<() => void>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let buildSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createdHubs.length = 0;
    onClosed = vi.fn<() => void>();
    callbacks = {
      onConnected: async () => undefined,
      onReconnecting: async () => undefined,
      onReconnected: async () => undefined,
      onClosed,
    };
    const tokenHelper = {
      isTokenExpired: vi.fn().mockReturnValue(false),
      attemptTokenRefresh: vi.fn().mockResolvedValue(undefined),
      validateTokenWithBackend: vi.fn().mockResolvedValue('valid'),
    } as unknown as SignalRTokenHelper;
    const localStorage = {
      get: vi.fn((key: string) => (key === StorageKeys.TOKEN ? 'a-token' : null)),
    } as unknown as LocalStorageService;
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
    buildSpy = vi.spyOn(signalR.HubConnectionBuilder.prototype, 'build').mockImplementation(() => {
      const hub = new FakeHub();
      createdHubs.push(hub);
      return hub as unknown as signalR.HubConnection;
    });

    helper = new SignalRConnectionHelper(tokenHelper, localStorage, 'wss://example.test/hub', {
      onVisibilityDrift: async () => undefined,
      onWatchdogNeedsReconnect: async () => undefined,
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    buildSpy.mockRestore();
    helper.dispose();
  });

  it('does not report a closed connection when the hub is stopped on purpose', async () => {
    // Arrange
    await helper.startConnection(() => undefined, callbacks);
    expect(helper.state()).toBe('Connected');

    // Act
    await helper.stopConnection();

    // Assert
    expect(createdHubs[0].stop).toHaveBeenCalledTimes(1);
    expect(onClosed).not.toHaveBeenCalled();
    expect(helper.state()).toBe('Idle');
  });

  it('reports a clean close of the current hub without an error, as a server close sends none', async () => {
    // Arrange
    await helper.startConnection(() => undefined, callbacks);

    // Act
    createdHubs[0].fireClose();

    // Assert
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('ignores a late close of a replaced hub and keeps the new connection', async () => {
    // Arrange
    await helper.startConnection(() => undefined, callbacks);
    await helper.stopConnection();
    await helper.startConnection(() => undefined, callbacks);

    // Act
    createdHubs[0].fireClose();

    // Assert
    expect(createdHubs).toHaveLength(2);
    expect(onClosed).not.toHaveBeenCalled();
    expect(helper.state()).toBe('Connected');
  });
});
