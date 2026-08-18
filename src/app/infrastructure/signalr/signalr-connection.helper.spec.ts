// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { SignalRConnectionHelper } from './signalr-connection.helper';
import { StorageKeys } from '../constants/storage-keys';

describe('SignalRConnectionHelper - token validation before AuthFailed', () => {
  let tokenHelper: any;
  let localStorage: any;
  let helper: SignalRConnectionHelper;
  let fetchSpy: any;

  const noopCallbacks = {
    onConnected: async () => undefined,
    onReconnecting: async () => undefined,
    onReconnected: async () => undefined,
    onClosed: () => undefined,
  };
  const noopOptions = {
    onVisibilityDrift: async () => undefined,
    onWatchdogNeedsReconnect: async () => undefined,
  };

  beforeEach(() => {
    tokenHelper = {
      isTokenExpired: vi.fn().mockReturnValue(false),
      attemptTokenRefresh: vi.fn().mockResolvedValue(undefined),
      validateTokenWithBackend: vi.fn(),
    };
    localStorage = {
      get: vi.fn().mockImplementation((key: string) =>
        key === StorageKeys.TOKEN ? 'a-token' : null
      ),
    };
    // Backend probe deliberately fails so a validation that recovers stops at
    // the 'Failed' transition instead of reaching real SignalR hub creation.
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

    helper = new SignalRConnectionHelper(
      tokenHelper,
      localStorage,
      'wss://example.test/hub',
      noopOptions
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    helper.dispose();
  });

  it('attempts one refresh and re-validates before giving up as AuthFailed', async () => {
    tokenHelper.validateTokenWithBackend.mockResolvedValue('rejected');

    await helper.startConnection(() => undefined, noopCallbacks);

    expect(tokenHelper.attemptTokenRefresh).toHaveBeenCalledTimes(1);
    expect(tokenHelper.validateTokenWithBackend).toHaveBeenCalledTimes(2);
    expect(helper.state()).toBe('AuthFailed');
  });

  it('recovers without AuthFailed when the retried validation succeeds', async () => {
    tokenHelper.validateTokenWithBackend
      .mockResolvedValueOnce('rejected')
      .mockResolvedValueOnce('valid');

    await helper.startConnection(() => undefined, noopCallbacks);

    expect(tokenHelper.attemptTokenRefresh).toHaveBeenCalledTimes(1);
    expect(tokenHelper.validateTokenWithBackend).toHaveBeenCalledTimes(2);
    expect(helper.state()).not.toBe('AuthFailed');
  });

  it('does not attempt a refresh when the token validates on the first try', async () => {
    tokenHelper.validateTokenWithBackend.mockResolvedValue('valid');

    await helper.startConnection(() => undefined, noopCallbacks);

    expect(tokenHelper.attemptTokenRefresh).not.toHaveBeenCalled();
    expect(tokenHelper.validateTokenWithBackend).toHaveBeenCalledTimes(1);
  });
});
