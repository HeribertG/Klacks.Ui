// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as signalR from '@microsoft/signalr';
import { SignalRConnectionHelper } from './signalr-connection.helper';
import { SessionRenewalOutcome } from 'src/app/domain/enums/session-renewal-outcome.enum';
import { X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE } from 'src/app/domain/constants/auth-request.constants';

class FakeHub {
  state = 'Disconnected';
  serverTimeoutInMilliseconds = 0;
  keepAliveIntervalInMilliseconds = 0;
  reconnectingCallbacks: (() => void)[] = [];
  start = vi.fn(async () => {
    this.state = 'Connected';
  });
  invoke = vi.fn(async () => 'connection-1');
  stop = vi.fn(async () => {
    this.state = 'Disconnected';
  });
  onreconnecting(callback: () => void): void {
    this.reconnectingCallbacks.push(callback);
  }
  onreconnected(): void {}
  onclose(): void {}
}

describe('SignalRConnectionHelper - cookie session', () => {
  let tokenHelper: any;
  let helper: SignalRConnectionHelper;
  let fetchSpy: any;
  let withUrlSpy: any;
  let buildSpy: any;
  let hub: FakeHub;

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
  const unauthorized = new Error("Failed to complete negotiation with the server: Error: Unauthorized: Status code '401'");

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    tokenHelper = {
      hasSession: vi.fn().mockReturnValue(true),
      isAccessExpired: vi.fn().mockReturnValue(false),
      attemptTokenRefresh: vi.fn().mockResolvedValue(SessionRenewalOutcome.Renewed),
    };
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
    hub = new FakeHub();
    withUrlSpy = vi.spyOn(signalR.HubConnectionBuilder.prototype, 'withUrl');
    buildSpy = vi.spyOn(signalR.HubConnectionBuilder.prototype, 'build').mockImplementation(
      () => hub as unknown as signalR.HubConnection
    );

    helper = new SignalRConnectionHelper(tokenHelper, 'wss://example.test/hub', noopOptions);
  });

  afterEach(() => {
    helper.dispose();
    vi.restoreAllMocks();
  });

  it('builds the hub with credentials and the CSRF header and without an access token factory', async () => {
    await helper.startConnection(() => undefined, noopCallbacks);

    const options = withUrlSpy.mock.calls[0][1];
    expect(options.withCredentials).toBe(true);
    expect(options.headers[X_REQUESTED_WITH_HEADER]).toBe(X_REQUESTED_WITH_VALUE);
    expect(options.accessTokenFactory).toBeUndefined();
    expect(helper.state()).toBe('Connected');
  });

  it('does not validate a token with the backend before connecting', async () => {
    await helper.startConnection(() => undefined, noopCallbacks);

    const urls = fetchSpy.mock.calls.map((call: unknown[]) => String(call[0]));
    expect(urls.some((url: string) => url.includes('ValidateToken'))).toBe(false);
  });

  it('stays idle without a local session', async () => {
    tokenHelper.hasSession.mockReturnValue(false);

    await helper.startConnection(() => undefined, noopCallbacks);

    expect(buildSpy).not.toHaveBeenCalled();
    expect(helper.state()).toBe('Idle');
  });

  it('renews the session once on a 401 and connects with the retried start', async () => {
    hub.start.mockRejectedValueOnce(unauthorized);

    await helper.startConnection(() => undefined, noopCallbacks);

    expect(tokenHelper.attemptTokenRefresh).toHaveBeenCalledTimes(1);
    expect(hub.start).toHaveBeenCalledTimes(2);
    expect(helper.state()).toBe('Connected');
  });

  it('ends in AuthFailed only when the server rejected the renewal', async () => {
    hub.start.mockRejectedValue(unauthorized);
    tokenHelper.attemptTokenRefresh.mockResolvedValue(SessionRenewalOutcome.Rejected);

    await helper.startConnection(() => undefined, noopCallbacks);

    expect(helper.state()).toBe('AuthFailed');
  });

  it('does not end in AuthFailed when a 401 persists after a successful renewal', async () => {
    hub.start.mockRejectedValue(unauthorized);

    await helper.startConnection(() => undefined, noopCallbacks);

    expect(tokenHelper.attemptTokenRefresh).toHaveBeenCalledTimes(1);
    expect(helper.state()).toBe('Failed');
  });

  describe('after a 401 that persisted a successful renewal', () => {
    const renewalPauseMs = 5 * 60 * 1000;
    const backoffBudgetMs = 20000;

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    async function restartAndSettle(): Promise<void> {
      const start = helper.startConnection(() => undefined, noopCallbacks);
      await vi.advanceTimersByTimeAsync(backoffBudgetMs);
      await start;
    }

    it('does not renew again on the next start but reconnects with backoff only', async () => {
      hub.start.mockRejectedValue(unauthorized);
      await restartAndSettle();
      expect(tokenHelper.attemptTokenRefresh).toHaveBeenCalledTimes(1);
      const startsBefore = hub.start.mock.calls.length;

      await restartAndSettle();

      expect(tokenHelper.attemptTokenRefresh).toHaveBeenCalledTimes(1);
      expect(hub.start.mock.calls.length - startsBefore).toBe(5);
      expect(helper.state()).toBe('Failed');
    });

    it('stays out of AuthFailed and connects once the 401 is gone', async () => {
      hub.start.mockRejectedValue(unauthorized);
      await restartAndSettle();

      hub.start.mockRejectedValueOnce(unauthorized).mockResolvedValue(undefined);
      await restartAndSettle();

      expect(tokenHelper.attemptTokenRefresh).toHaveBeenCalledTimes(1);
      expect(helper.state()).toBe('Connected');
    });

    it('renews again once the pause has passed', async () => {
      hub.start.mockRejectedValue(unauthorized);
      await restartAndSettle();

      vi.setSystemTime(Date.now() + renewalPauseMs + 1);
      await restartAndSettle();

      expect(tokenHelper.attemptTokenRefresh).toHaveBeenCalledTimes(2);
    });

    it('ends the pause when the connection is stopped (logout)', async () => {
      hub.start.mockRejectedValue(unauthorized);
      await restartAndSettle();

      await helper.stopConnection();
      await restartAndSettle();

      expect(tokenHelper.attemptTokenRefresh).toHaveBeenCalledTimes(2);
    });

    it('does not pause renewals when the renewal itself was unavailable', async () => {
      hub.start.mockRejectedValue(unauthorized);
      tokenHelper.attemptTokenRefresh.mockResolvedValue(SessionRenewalOutcome.Unavailable);
      await restartAndSettle();

      await restartAndSettle();

      expect(tokenHelper.attemptTokenRefresh).toHaveBeenCalledTimes(2);
    });
  });

  it('renews an expired session when the hub starts reconnecting', async () => {
    await helper.startConnection(() => undefined, noopCallbacks);
    tokenHelper.isAccessExpired.mockReturnValue(true);

    hub.reconnectingCallbacks.forEach((callback) => callback());

    expect(tokenHelper.attemptTokenRefresh).toHaveBeenCalledTimes(1);
  });

  it('warns on Failed and AuthFailed transitions but not on Reconnecting', () => {
    const warnSpy = console.warn as unknown as ReturnType<typeof vi.fn>;
    warnSpy.mockClear();

    (helper as any).transitionTo('Reconnecting');
    expect(warnSpy).not.toHaveBeenCalled();

    (helper as any).transitionTo('Failed');
    expect(warnSpy).toHaveBeenCalledTimes(1);

    (helper as any).transitionTo('AuthFailed');
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
