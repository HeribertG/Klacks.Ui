// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Hub connection lifecycle helper: creates, starts, retries and monitors the SignalR hub connection.
 * Owns the connection FSM (Idle/Connecting/Connected/Reconnecting/Failed) and exposes telemetry counters
 * for diagnostics. Health check and watchdog notify the facade via callbacks so reconnect orchestration
 * stays in the facade.
 * @param tokenHelper - Token refresh and expiry logic
 * @param localStorage - Reads JWT token for the access token factory
 * @param hubUrl - WebSocket hub endpoint URL
 * @param options - Callbacks fired on visibility drift and watchdog-triggered reconnect need
 */
import * as signalR from '@microsoft/signalr';
import { computed, signal, Signal } from '@angular/core';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageKeys } from '../constants/storage-keys';
import { SignalRConstants } from './signalr.constants';
import { environment } from 'src/environments/environment';
import { SignalRTokenHelper } from './signalr-token.helper';
import {
  jitter,
  SignalRConnectionState,
  SignalRTelemetry,
} from './signalr-connection-state';

export interface SignalRConnectionOptions {
  onVisibilityDrift: () => Promise<void>;
  onWatchdogNeedsReconnect: () => Promise<void>;
}

export interface SignalRConnectionCallbacks {
  onConnected: () => Promise<void>;
  onReconnecting: () => Promise<void>;
  onReconnected: (hub: signalR.HubConnection) => Promise<void>;
  onClosed: () => void;
}

const RETRY_DELAYS_MS: readonly number[] = [0, 1000, 2000, 5000, 10000];
const BACKEND_PROBE_TIMEOUT_MS = 2000;

export class SignalRConnectionHelper {
  private readonly _state = signal<SignalRConnectionState>('Idle');
  private readonly _connectionId = signal('');
  private readonly _reconnectCount = signal(0);
  private readonly _authErrorCount = signal(0);
  private readonly _lastDisconnectAt = signal<number | null>(null);
  private readonly _lastReconnectAt = signal<number | null>(null);
  private readonly _lastSuccessfulPushAt = signal<number | null>(null);
  private readonly _avgDisconnectDurationMs = signal(0);
  private readonly _lastErrorMessage = signal<string | null>(null);
  private readonly _isConnectedDerived = computed(() => this._state() === 'Connected');

  private _hubConnection: signalR.HubConnection | null = null;
  private _pendingStart: Promise<void> | null = null;
  private _disconnectSamples = 0;

  readonly state: Signal<SignalRConnectionState> = this._state.asReadonly();
  readonly isConnected: Signal<boolean> = this._isConnectedDerived;
  readonly connectionId: Signal<string> = this._connectionId.asReadonly();

  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;

  private static readonly SERVER_TIMEOUT_MS = 20000;
  private static readonly KEEP_ALIVE_INTERVAL_MS = 10000;
  private static readonly HEALTH_CHECK_INTERVAL_MS = 30000;
  private static readonly WATCHDOG_INTERVAL_MS = 30000;

  get hubConnection(): signalR.HubConnection | null {
    return this._hubConnection;
  }

  get telemetry(): SignalRTelemetry {
    return {
      state: this._state(),
      reconnectCount: this._reconnectCount(),
      authErrorCount: this._authErrorCount(),
      lastDisconnectAt: this._lastDisconnectAt(),
      lastReconnectAt: this._lastReconnectAt(),
      lastSuccessfulPushAt: this._lastSuccessfulPushAt(),
      avgDisconnectDurationMs: this._avgDisconnectDurationMs(),
      lastErrorMessage: this._lastErrorMessage(),
    };
  }

  notePush(): void {
    this._lastSuccessfulPushAt.set(Date.now());
  }

  resetAuthFailure(): void {
    if (this._state() !== 'AuthFailed') return;
    this.transitionTo('Idle');
    this.startWatchdog();
  }

  constructor(
    private readonly tokenHelper: SignalRTokenHelper,
    private readonly localStorage: LocalStorageService,
    private readonly hubUrl: string,
    private readonly options: SignalRConnectionOptions,
  ) {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.startWatchdog();
  }

  async startConnection(
    registerHandlers: (hub: signalR.HubConnection) => void,
    callbacks: SignalRConnectionCallbacks,
  ): Promise<void> {
    if (this._state() === 'Connected' || this._state() === 'AuthFailed') {
      return;
    }
    if (this._pendingStart) {
      await this._pendingStart;
      return;
    }
    this.transitionTo('Connecting');
    this._pendingStart = (async () => {
      try {
        await this.startConnectionInternal(registerHandlers, callbacks);
      } finally {
        this._pendingStart = null;
      }
    })();
    await this._pendingStart;
  }

  async stopConnection(): Promise<void> {
    this.stopHealthCheck();
    if (this._hubConnection) {
      try {
        await this._hubConnection.stop();
      } catch {
        // hub.stop() rarely throws but never blocks teardown
      }
      this._connectionId.set('');
      this._hubConnection = null;
    }
    this.transitionTo('Idle');
  }

  startHealthCheck(onDrift: () => Promise<void>): void {
    this.stopHealthCheck();
    this.healthCheckTimer = setInterval(async () => {
      const hub = this._hubConnection;
      const hubState = hub?.state;
      const hubConnected = hubState === signalR.HubConnectionState.Connected;
      const stateConnected = this._state() === 'Connected';

      if (stateConnected && hubConnected && hub) {
        try {
          await hub.invoke<string>(SignalRConstants.HubMethods.GetConnectionId);
        } catch (error) {
          console.warn('[SignalR] health check failed - forcing reconnect', error);
          this.markErrorMessage(error);
          this.transitionTo('Reconnecting');
          await onDrift();
        }
      } else if (stateConnected && !hubConnected) {
        console.warn('[SignalR] state drift detected (hub=' + hubState + ') - forcing reconnect');
        this.transitionTo('Reconnecting');
        await onDrift();
      }
    }, SignalRConnectionHelper.HEALTH_CHECK_INTERVAL_MS);
  }

  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  stopWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  dispose(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.stopHealthCheck();
    this.stopWatchdog();
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      const state = this._state();
      if (state === 'Connected' || state === 'Connecting' || state === 'AuthFailed') return;

      const token = this.localStorage.get(StorageKeys.TOKEN);
      if (!token) return;
      if (this.tokenHelper.isTokenExpired(token)) return;

      console.warn('[SignalR] watchdog: state=' + state + ' with usable token - attempting reconnect');
      void this.options.onWatchdogNeedsReconnect();
    }, SignalRConnectionHelper.WATCHDOG_INTERVAL_MS);
  }

  private handleVisibilityChange = async (): Promise<void> => {
    if (
      document.visibilityState === 'visible' &&
      this._state() === 'Connected' &&
      this._hubConnection?.state !== signalR.HubConnectionState.Connected
    ) {
      console.warn('[SignalR] tab visible, connection state drift detected - forcing reconnect');
      this.transitionTo('Reconnecting');
      await this.options.onVisibilityDrift();
    }
  };

  private async startConnectionInternal(
    registerHandlers: (hub: signalR.HubConnection) => void,
    callbacks: SignalRConnectionCallbacks,
  ): Promise<void> {
    let token = this.localStorage.get(StorageKeys.TOKEN);
    if (!token) {
      console.warn('[SignalR] no token available, aborting startConnection');
      this.transitionTo('Idle');
      return;
    }

    if (this.tokenHelper.isTokenExpired(token)) {
      console.warn('[SignalR] token expired at startup, attempting refresh before connecting');
      await this.tokenHelper.attemptTokenRefresh();
      token = this.localStorage.get(StorageKeys.TOKEN);
      if (!token || this.tokenHelper.isTokenExpired(token)) {
        console.warn('[SignalR] token refresh did not yield a valid token, aborting startConnection');
        this.transitionTo('Failed');
        return;
      }
    }

    const [validation, backendReady] = await Promise.all([
      this.tokenHelper.validateTokenWithBackend(token),
      this.probeBackend(),
    ]);

    if (validation === 'rejected') {
      console.warn('[SignalR] token rejected by backend - stale credentials, giving up until re-login');
      this.stopWatchdog();
      this.transitionTo('AuthFailed');
      return;
    }
    if (validation === 'unreachable' || !backendReady) {
      console.warn('[SignalR] backend not reachable - watchdog will retry');
      this.transitionTo('Failed');
      return;
    }

    const hub = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.localStorage.get(StorageKeys.TOKEN) ?? '',
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    hub.serverTimeoutInMilliseconds = SignalRConnectionHelper.SERVER_TIMEOUT_MS;
    hub.keepAliveIntervalInMilliseconds = SignalRConnectionHelper.KEEP_ALIVE_INTERVAL_MS;

    this._hubConnection = hub;

    registerHandlers(hub);
    this.registerConnectionEvents(hub, callbacks);

    await this.connectWithRetry(hub, callbacks.onConnected);
  }

  private async probeBackend(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BACKEND_PROBE_TIMEOUT_MS);
    try {
      const response = await fetch(environment.healthUrl, { method: 'GET', signal: controller.signal });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  private async connectWithRetry(
    hub: signalR.HubConnection,
    onConnected: () => Promise<void>,
  ): Promise<void> {
    let tokenRefreshAttempted = false;

    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
      if (this._hubConnection !== hub) {
        console.warn('[SignalR] hub instance replaced during retry - aborting connect loop');
        return;
      }
      try {
        await hub.start();
        if (this._hubConnection !== hub) {
          console.warn('[SignalR] hub instance replaced after start - aborting connect loop');
          return;
        }
        const connectionId = await hub.invoke<string>(
          SignalRConstants.HubMethods.GetConnectionId,
        );
        this._connectionId.set(connectionId);
        this.recordReconnectIfNeeded();
        this.transitionTo('Connected');
        await onConnected();
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SignalR] connect attempt', attempt, 'failed:', errorMessage);
        this._lastErrorMessage.set(errorMessage);

        if (errorMessage.includes('401')) {
          this._authErrorCount.update((v) => v + 1);
          if (!tokenRefreshAttempted) {
            tokenRefreshAttempted = true;
            console.warn('[SignalR] 401 on connect - refreshing token and retrying once');
            await this.tokenHelper.attemptTokenRefresh();
            continue;
          }
          console.warn('[SignalR] 401 persisted after token refresh - stale credentials, giving up until re-login');
          this.stopWatchdog();
          await this.disposeHub(hub);
          this.transitionTo('AuthFailed');
          return;
        }

        if (attempt < RETRY_DELAYS_MS.length - 1) {
          const delay = jitter(RETRY_DELAYS_MS[attempt] ?? 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          this.transitionTo('Failed');
        }
      }
    }
  }

  private registerConnectionEvents(
    hub: signalR.HubConnection,
    callbacks: SignalRConnectionCallbacks,
  ): void {
    hub.onreconnecting(async () => {
      this.transitionTo('Reconnecting');
      await callbacks.onReconnecting();
    });

    hub.onreconnected(async (connectionId) => {
      if (connectionId) {
        this._connectionId.set(connectionId);
      } else {
        const id = await hub.invoke<string>(SignalRConstants.HubMethods.GetConnectionId);
        this._connectionId.set(id || '');
      }
      this.recordReconnectIfNeeded();
      this.transitionTo('Connected');
      await callbacks.onReconnected(hub);
    });

    hub.onclose(() => {
      const previous = this._state();
      if (previous === 'Connected' || previous === 'Reconnecting') {
        this.transitionTo('Idle');
      }
      callbacks.onClosed();
    });
  }

  private transitionTo(next: SignalRConnectionState): void {
    const previous = this._state();
    if (previous === next) return;

    if (next === 'Idle' || next === 'Reconnecting' || next === 'Failed' || next === 'AuthFailed') {
      if (previous === 'Connected') {
        this._lastDisconnectAt.set(Date.now());
      }
    }

    this._state.set(next);
    this.logTransition(previous, next);
  }

  private logTransition(previous: SignalRConnectionState, next: SignalRConnectionState): void {
    if (typeof window === 'undefined') return;
    const verbose = window.location?.search?.includes('debug=signalr');
    if (verbose) {
      console.info(
        '[SignalR] transition',
        previous,
        '->',
        next,
        'telemetry=',
        this.telemetry,
      );
    } else if (next === 'Failed' || next === 'Reconnecting' || next === 'AuthFailed') {
      console.info('[SignalR] transition', previous, '->', next);
    }
  }

  private recordReconnectIfNeeded(): void {
    const lastDisconnect = this._lastDisconnectAt();
    if (lastDisconnect !== null) {
      const downtime = Date.now() - lastDisconnect;
      const samples = this._disconnectSamples;
      const prevAvg = this._avgDisconnectDurationMs();
      const newAvg = Math.round((prevAvg * samples + downtime) / (samples + 1));
      this._avgDisconnectDurationMs.set(newAvg);
      this._disconnectSamples = samples + 1;
      this._reconnectCount.update((v) => v + 1);
      this._lastReconnectAt.set(Date.now());
    }
  }

  private markErrorMessage(error: unknown): void {
    this._lastErrorMessage.set(error instanceof Error ? error.message : String(error));
  }

  private async disposeHub(hub: signalR.HubConnection): Promise<void> {
    if (this._hubConnection === hub) {
      this._hubConnection = null;
    }
    try {
      await hub.stop();
    } catch {
      // hub.stop() rarely throws and never blocks teardown
    }
  }
}
