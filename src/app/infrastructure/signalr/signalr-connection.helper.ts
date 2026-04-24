// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Hub connection lifecycle helper: creates, starts, retries and monitors the SignalR hub connection.
 * Health check and watchdog notify the facade via callbacks so reconnect orchestration stays in the facade.
 * @param tokenHelper - Token refresh and expiry logic
 * @param localStorage - Reads JWT token for the access token factory
 * @param hubUrl - WebSocket hub endpoint URL
 * @param options - Callbacks fired on visibility drift and watchdog-triggered reconnect need
 */
import * as signalR from '@microsoft/signalr';
import { signal, Signal } from '@angular/core';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageKeys } from '../constants/storage-keys';
import { SignalRConstants } from './signalr.constants';
import { environment } from 'src/environments/environment';
import { SignalRTokenHelper } from './signalr-token.helper';

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

export class SignalRConnectionHelper {
  private readonly _isConnected = signal(false);
  private readonly _connectionId = signal('');
  private _hubConnection: signalR.HubConnection | null = null;
  private _isStarting = false;

  readonly isConnected: Signal<boolean> = this._isConnected.asReadonly();
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

  get isStarting(): boolean {
    return this._isStarting;
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
    if (this._isStarting || this._hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }
    this._isStarting = true;
    try {
      await this.startConnectionInternal(registerHandlers, callbacks);
    } finally {
      this._isStarting = false;
    }
  }

  async stopConnection(): Promise<void> {
    this.stopHealthCheck();
    if (this._hubConnection) {
      await this._hubConnection.stop();
      this._isConnected.set(false);
      this._connectionId.set('');
      this._hubConnection = null;
    }
  }

  startHealthCheck(onDrift: () => Promise<void>): void {
    this.stopHealthCheck();
    this.healthCheckTimer = setInterval(async () => {
      const hubState = this._hubConnection?.state;
      const hubConnected = hubState === signalR.HubConnectionState.Connected;

      if (this._isConnected() && hubConnected) {
        try {
          await this._hubConnection!.invoke<string>(SignalRConstants.HubMethods.GetConnectionId);
        } catch (error) {
          console.warn('[SignalR] health check failed - forcing reconnect', error);
          this._isConnected.set(false);
          await onDrift();
        }
      } else if (this._isConnected() && !hubConnected) {
        console.warn('[SignalR] state drift detected (hub=' + hubState + ') - forcing reconnect');
        this._isConnected.set(false);
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
      const hasToken = !!this.localStorage.get(StorageKeys.TOKEN);
      if (!hasToken || this._isConnected() || this._isStarting) return;
      console.warn('[SignalR] watchdog: disconnected with valid token present - attempting reconnect');
      void this.options.onWatchdogNeedsReconnect();
    }, SignalRConnectionHelper.WATCHDOG_INTERVAL_MS);
  }

  private handleVisibilityChange = async (): Promise<void> => {
    if (
      document.visibilityState === 'visible' &&
      this._isConnected() &&
      this._hubConnection?.state !== signalR.HubConnectionState.Connected
    ) {
      console.warn('[SignalR] tab visible, connection state drift detected - forcing reconnect');
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
      return;
    }

    if (this.tokenHelper.isTokenExpired(token)) {
      console.warn('[SignalR] token expired at startup, attempting refresh before connecting');
      await this.tokenHelper.attemptTokenRefresh();
      token = this.localStorage.get(StorageKeys.TOKEN);
      if (!token || this.tokenHelper.isTokenExpired(token)) {
        console.warn('[SignalR] token refresh did not yield a valid token, aborting startConnection');
        return;
      }
    }

    const isValid = await this.tokenHelper.validateTokenWithBackend(token);
    if (!isValid) {
      console.warn('[SignalR] token validation failed, aborting');
      return;
    }

    this._hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.localStorage.get(StorageKeys.TOKEN) ?? '',
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this._hubConnection.serverTimeoutInMilliseconds = SignalRConnectionHelper.SERVER_TIMEOUT_MS;
    this._hubConnection.keepAliveIntervalInMilliseconds = SignalRConnectionHelper.KEEP_ALIVE_INTERVAL_MS;

    registerHandlers(this._hubConnection);
    this.registerConnectionEvents(this._hubConnection, callbacks);

    await this.waitForBackend();
    await this.connectWithRetry(callbacks.onConnected);
  }

  private async waitForBackend(maxAttempts = 10, intervalMs = 1000): Promise<void> {
    const healthUrl = environment.baseUrl.replace('/api/backend/', '/health');
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(healthUrl, { method: 'GET' });
        if (response.ok) return;
      } catch {
        // Backend not ready yet
      }
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }

  private async connectWithRetry(onConnected: () => Promise<void>): Promise<void> {
    const retryDelays = [0, 1000, 2000, 5000, 10000];
    let tokenRefreshAttempted = false;

    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      try {
        await this._hubConnection!.start();
        const connectionId = await this._hubConnection!.invoke<string>(
          SignalRConstants.HubMethods.GetConnectionId,
        );
        this._connectionId.set(connectionId);
        this._isConnected.set(true);
        await onConnected();
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SignalR] connect attempt', attempt, 'failed:', errorMessage);

        if (errorMessage.includes('401')) {
          if (!tokenRefreshAttempted) {
            tokenRefreshAttempted = true;
            console.warn('[SignalR] 401 on connect - refreshing token and retrying once');
            await this.tokenHelper.attemptTokenRefresh();
            continue;
          }
          console.warn('[SignalR] 401 persisted after token refresh - giving up until next watchdog tick');
          this._isConnected.set(false);
          return;
        }

        const delay = retryDelays[attempt] ?? 10000;
        if (attempt < retryDelays.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          this._isConnected.set(false);
        }
      }
    }
  }

  private registerConnectionEvents(
    hub: signalR.HubConnection,
    callbacks: SignalRConnectionCallbacks,
  ): void {
    hub.onreconnecting(async () => {
      this._isConnected.set(false);
      await callbacks.onReconnecting();
    });

    hub.onreconnected(async (connectionId) => {
      if (connectionId) {
        this._connectionId.set(connectionId);
      } else {
        const id = await hub.invoke<string>(SignalRConstants.HubMethods.GetConnectionId);
        this._connectionId.set(id || '');
      }
      this._isConnected.set(true);
      await callbacks.onReconnected(hub);
    });

    hub.onclose(() => {
      this._isConnected.set(false);
      callbacks.onClosed();
    });
  }
}
