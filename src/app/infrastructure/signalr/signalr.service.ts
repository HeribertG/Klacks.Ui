// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageKeys } from '../constants/storage-keys';
import { SignalRConstants } from './signalr.constants';
import { IWorkNotification } from 'src/app/domain/interfaces/work-notification.interface';
import { IShiftStatsNotification } from 'src/app/domain/interfaces/shift-stats-notification.interface';
import { IScheduleNotification } from 'src/app/domain/interfaces/schedule-notification.interface';
import {
  IPeriodHoursNotification,
  IPeriodHoursRecalculatedNotification,
} from 'src/app/domain/interfaces/period-hours-notification.interface';
import { IScheduleChangeNotification } from 'src/app/domain/interfaces/schedule-change-notification.interface';
import { ICollisionListNotification } from 'src/app/domain/interfaces/collision-notification.interface';
import { IScheduleValidationListNotification } from 'src/app/domain/interfaces/schedule-validation-list-notification.interface';
import { IScheduleSignalR } from 'src/app/domain/interfaces/schedule-signalr.interface';

@Injectable({
  providedIn: 'root',
})
export class SignalRService implements OnDestroy, IScheduleSignalR {
  private localStorageService = inject(LocalStorageService);

  private hubConnection: signalR.HubConnection | null = null;
  private readonly hubUrl: string;

  private _connectionId = signal<string>('');
  private _isConnected = signal<boolean>(false);

  public workCreated$ = new Subject<IWorkNotification>();
  public workUpdated$ = new Subject<IWorkNotification>();
  public workDeleted$ = new Subject<IWorkNotification>();
  public scheduleUpdated$ = new Subject<IScheduleNotification>();
  public shiftStatsUpdated$ = new Subject<IShiftStatsNotification>();
  public periodHoursUpdated$ = new Subject<IPeriodHoursNotification>();
  public periodHoursRecalculated$ = new Subject<IPeriodHoursRecalculatedNotification>();
  public scheduleChangeTracked$ = new Subject<IScheduleChangeNotification>();
  public collisionsDetected$ = new Subject<ICollisionListNotification>();
  public scheduleValidationsDetected$ = new Subject<IScheduleValidationListNotification>();
  public reconnected$ = new Subject<void>();

  private currentGroup: { startDate: string; endDate: string; analyseToken: string | null } | null = null;
  private pendingGroupSwitch: Promise<void> | null = null;
  private reconnectAttemptWithExpiredToken = false;
  private static readonly TOKEN_EXPIRY_BUFFER_MS = 30000;
  private static readonly CONNECTION_REFRESH_DELAY_MS = 1000;
  private static readonly TOKEN_REFRESH_CHECK_INTERVAL_MS = 60000;
  private static readonly HEALTH_CHECK_INTERVAL_MS = 30000;
  private static readonly WATCHDOG_INTERVAL_MS = 30000;
  private static readonly SERVER_TIMEOUT_MS = 20000;
  private static readonly KEEP_ALIVE_INTERVAL_MS = 10000;
  private tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private isStarting = false;

  constructor() {
    this.hubUrl = environment.baseUrl.replace('/api/backend/', SignalRConstants.HubPath);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.startWatchdog();
  }

  private onVisibilityChange = async (): Promise<void> => {
    if (
      document.visibilityState === 'visible' &&
      this._isConnected() &&
      this.hubConnection?.state !== signalR.HubConnectionState.Connected
    ) {
      console.warn('[SignalR] tab visible, connection state drift detected - forcing reconnect');
      await this.refreshConnection();
    }
  };

  get connectionId(): string {
    return this._connectionId();
  }

  get isConnected(): boolean {
    return this._isConnected();
  }

  async startConnection(): Promise<void> {
    if (this.isStarting) {
      return;
    }
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }
    this.isStarting = true;
    try {
      await this.startConnectionInternal();
    } finally {
      this.isStarting = false;
    }
  }

  private async startConnectionInternal(): Promise<void> {
    let token = this.localStorageService.get(StorageKeys.TOKEN);
    if (!token) {
      console.warn('[SignalR] no token available, aborting startConnection');
      return;
    }

    if (this.isTokenExpired(token)) {
      console.warn('[SignalR] token expired at startup, attempting refresh before connecting');
      await this.attemptTokenRefresh();
      token = this.localStorageService.get(StorageKeys.TOKEN);
      if (!token || this.isTokenExpired(token)) {
        console.warn('[SignalR] token refresh did not yield a valid token, aborting startConnection');
        return;
      }
    }

    const isValid = await this.validateTokenWithBackend(token);
    if (!isValid) {
      console.warn('[SignalR] token validation failed, aborting');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.localStorageService.get(StorageKeys.TOKEN) ?? '',
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection.serverTimeoutInMilliseconds = SignalRService.SERVER_TIMEOUT_MS;
    this.hubConnection.keepAliveIntervalInMilliseconds = SignalRService.KEEP_ALIVE_INTERVAL_MS;

    this.registerEventHandlers();
    this.registerConnectionEvents();

    await this.waitForBackend();
    await this.connectWithRetry();
  }

  private async waitForBackend(maxAttempts = 10, intervalMs = 1000): Promise<void> {
    const healthUrl = environment.baseUrl.replace('/api/backend/', '/health');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(healthUrl, { method: 'GET' });
        if (response.ok) {
          return;
        }
      } catch {
        // Backend not ready yet
      }

      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }

  private async connectWithRetry(maxRetries = 5): Promise<void> {
    const retryDelays = [0, 1000, 2000, 5000, 10000];
    let tokenRefreshAttempted = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.hubConnection!.start();
        const connectionId = await this.hubConnection!.invoke<string>(SignalRConstants.HubMethods.GetConnectionId);
        this._connectionId.set(connectionId);
        this._isConnected.set(true);
        this.startProactiveTokenRefresh();
        this.startHealthCheck();
        await this.rejoinCurrentGroup();
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SignalR] connect attempt', attempt, 'failed:', errorMessage);

        if (errorMessage.includes('401')) {
          if (!tokenRefreshAttempted) {
            tokenRefreshAttempted = true;
            console.warn('[SignalR] 401 on connect - refreshing token and retrying once');
            await this.attemptTokenRefresh();
            continue;
          }
          console.warn('[SignalR] 401 persisted after token refresh - giving up until next watchdog tick');
          this._isConnected.set(false);
          return;
        }

        const delay = retryDelays[attempt] ?? 10000;
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          this._isConnected.set(false);
        }
      }
    }
  }

  async stopConnection(): Promise<void> {
    this.stopProactiveTokenRefresh();
    this.stopHealthCheck();
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this._isConnected.set(false);
      this._connectionId.set('');
      this.currentGroup = null;
    }
  }

  async refreshConnection(): Promise<void> {
    const previousGroup = this.currentGroup;
    await this.stopConnection();
    await this.startConnection();

    if (previousGroup && this.isConnected) {
      await this.joinScheduleGroup(previousGroup.startDate, previousGroup.endDate, previousGroup.analyseToken);
    }
  }

  async joinScheduleGroup(startDate: string, endDate: string, analyseToken: string | null = null): Promise<void> {
    if (this.pendingGroupSwitch) {
      await this.pendingGroupSwitch;
    }

    this.pendingGroupSwitch = this.performGroupSwitch(startDate, endDate, analyseToken);

    try {
      await this.pendingGroupSwitch;
    } finally {
      this.pendingGroupSwitch = null;
    }
  }

  private async performGroupSwitch(startDate: string, endDate: string, analyseToken: string | null): Promise<void> {
    if (!this.hubConnection || !this.isConnected) {

      this.currentGroup = { startDate, endDate, analyseToken };
      return;
    }

    if (this.currentGroup) {
      await this.leaveScheduleGroup(
        this.currentGroup.startDate,
        this.currentGroup.endDate,
        this.currentGroup.analyseToken,
      );
    }

    try {
      await this.hubConnection.invoke(
        SignalRConstants.HubMethods.JoinScheduleGroup,
        startDate,
        endDate,
        analyseToken ?? '',
      );
      this.currentGroup = { startDate, endDate, analyseToken };

    } catch {
      this.currentGroup = { startDate, endDate, analyseToken };
    }
  }

  async leaveScheduleGroup(startDate: string, endDate: string, analyseToken: string | null = null): Promise<void> {
    if (!this.hubConnection || !this.isConnected) {
      return;
    }

    try {
      await this.hubConnection.invoke(
        SignalRConstants.HubMethods.LeaveScheduleGroup,
        startDate,
        endDate,
        analyseToken ?? '',
      );
      if (
        this.currentGroup?.startDate === startDate &&
        this.currentGroup?.endDate === endDate &&
        this.currentGroup?.analyseToken === analyseToken
      ) {
        this.currentGroup = null;
      }

    } catch {
      // ignored
    }
  }

  async setSelectedGroup(selectedGroupId: string): Promise<void> {
    if (!this.hubConnection || !this.isConnected) return;

    try {
      await this.hubConnection.invoke(SignalRConstants.HubMethods.SetSelectedGroup, selectedGroupId);
    } catch {
      // ignored
    }
  }

  async rejoinCurrentGroup(): Promise<void> {

    if (this.currentGroup && this.isConnected) {
      const { startDate, endDate, analyseToken } = this.currentGroup;
      this.currentGroup = null;

      await this.joinScheduleGroup(startDate, endDate, analyseToken);
    }
  }

  private registerEventHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on(SignalRConstants.Events.WorkCreated, (notification: IWorkNotification) => {
      this.workCreated$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.WorkUpdated, (notification: IWorkNotification) => {
      this.workUpdated$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.WorkDeleted, (notification: IWorkNotification) => {
      this.workDeleted$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.ScheduleUpdated, (notification: IScheduleNotification) => {
      this.scheduleUpdated$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.ShiftStatsUpdated, (notification: IShiftStatsNotification) => {
      this.shiftStatsUpdated$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.PeriodHoursUpdated, (notification: IPeriodHoursNotification) => {
      this.periodHoursUpdated$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.PeriodHoursRecalculated, (notification: IPeriodHoursRecalculatedNotification) => {
      this.periodHoursRecalculated$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.ScheduleChangeTracked, (notification: IScheduleChangeNotification) => {
      this.scheduleChangeTracked$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.CollisionsDetected, (notification: ICollisionListNotification) => {
      this.collisionsDetected$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.ScheduleValidationsDetected, (notification: IScheduleValidationListNotification) => {
      this.scheduleValidationsDetected$.next(notification);
    });
  }

  private registerConnectionEvents(): void {
    if (!this.hubConnection) return;

    this.hubConnection.onreconnecting(async () => {
      
      this._isConnected.set(false);

      const token = this.localStorageService.get(StorageKeys.TOKEN);
      if (token && this.isTokenExpired(token)) {
        
        this.reconnectAttemptWithExpiredToken = true;
        await this.attemptTokenRefresh();
      }
    });

    this.hubConnection.onreconnected(async (connectionId) => {
      

      if (this.reconnectAttemptWithExpiredToken) {
        const token = this.localStorageService.get(StorageKeys.TOKEN);
        if (token && this.isTokenExpired(token)) {
          
          this.scheduleConnectionRefresh();
        }
        this.reconnectAttemptWithExpiredToken = false;
      }

      if (connectionId) {
        this._connectionId.set(connectionId);
      } else {
        const newId = await this.hubConnection?.invoke<string>(SignalRConstants.HubMethods.GetConnectionId);
        this._connectionId.set(newId || '');
      }
      this._isConnected.set(true);
      await this.rejoinCurrentGroup();
      this.reconnected$.next();
    });

    this.hubConnection.onclose((_error) => {
      this._isConnected.set(false);
      this.reconnectAttemptWithExpiredToken = false;
      this.scheduleFullReconnect();
    });
  }

  private async attemptTokenRefresh(): Promise<void> {
    try {
      const refreshToken = this.localStorageService.get(StorageKeys.TOKEN_REFRESHTOKEN);
      if (!refreshToken) {
        console.warn('[SignalR] no refresh token in storage - cannot refresh');
        return;
      }

      const refreshUrl = environment.baseUrl + 'Accounts/RefreshToken';
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.warn('[SignalR] refresh endpoint returned', response.status);
        return;
      }

      const data = await response.json();
      if (!data?.token) {
        console.warn('[SignalR] refresh response missing token field');
        return;
      }

      this.localStorageService.set(StorageKeys.TOKEN, data.token);
      if (data.refreshToken) {
        this.localStorageService.set(StorageKeys.TOKEN_REFRESHTOKEN, data.refreshToken);
      }
      if (data.expTime !== undefined && data.expTime !== null) {
        this.localStorageService.set(StorageKeys.TOKEN_EXP, data.expTime.toString());
      }
    } catch (error) {
      console.warn('[SignalR] refresh request failed', error);
    }
  }

  private scheduleConnectionRefresh(): void {
    setTimeout(async () => {
      const token = this.localStorageService.get(StorageKeys.TOKEN);
      if (token && !this.isTokenExpired(token)) {
        await this.refreshConnection();
      }
    }, SignalRService.CONNECTION_REFRESH_DELAY_MS);
  }

  private scheduleFullReconnect(attempt = 0): void {
    const delays = [2000, 5000, 10000, 30000, 60000];
    const delay = delays[Math.min(attempt, delays.length - 1)];

    setTimeout(async () => {
      let token = this.localStorageService.get(StorageKeys.TOKEN);
      if (!token) {
        return;
      }

      if (this.isTokenExpired(token)) {
        await this.attemptTokenRefresh();
        token = this.localStorageService.get(StorageKeys.TOKEN);
        if (!token || this.isTokenExpired(token)) {
          this.scheduleFullReconnect(attempt + 1);
          return;
        }
      }

      try {
        await this.refreshConnection();
        if (!this.isConnected) {
          this.scheduleFullReconnect(attempt + 1);
        }
      } catch {
        this.scheduleFullReconnect(attempt + 1);
      }
    }, delay);
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.stopProactiveTokenRefresh();
    this.stopHealthCheck();
    this.stopWatchdog();
    this.stopConnection();
    this.workCreated$.complete();
    this.workUpdated$.complete();
    this.workDeleted$.complete();
    this.scheduleUpdated$.complete();
    this.shiftStatsUpdated$.complete();
    this.periodHoursUpdated$.complete();
    this.periodHoursRecalculated$.complete();
    this.scheduleChangeTracked$.complete();
    this.collisionsDetected$.complete();
    this.scheduleValidationsDetected$.complete();
    this.reconnected$.complete();
  }

  private async validateTokenWithBackend(token: string): Promise<boolean> {
    try {
      const validateUrl = environment.baseUrl + 'Accounts/ValidateToken';
      const response = await fetch(validateUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private startProactiveTokenRefresh(): void {
    this.stopProactiveTokenRefresh();
    this.tokenRefreshTimer = setInterval(async () => {
      const token = this.localStorageService.get(StorageKeys.TOKEN);
      if (token && this.isTokenExpired(token)) {
        await this.attemptTokenRefresh();
        const refreshedToken = this.localStorageService.get(StorageKeys.TOKEN);
        if (refreshedToken && !this.isTokenExpired(refreshedToken) && this.isConnected) {
          await this.refreshConnection();
        }
      }
    }, SignalRService.TOKEN_REFRESH_CHECK_INTERVAL_MS);
  }

  private stopProactiveTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.healthCheckTimer = setInterval(async () => {
      const serviceConnected = this._isConnected();
      const hubState = this.hubConnection?.state;
      const hubConnected = hubState === signalR.HubConnectionState.Connected;

      if (serviceConnected && hubConnected) {
        try {
          await this.hubConnection!.invoke<string>(SignalRConstants.HubMethods.GetConnectionId);
        } catch (error) {
          console.warn('[SignalR] health check failed - forcing reconnect', error);
          this._isConnected.set(false);
          await this.refreshConnection();
        }
      } else if (serviceConnected && !hubConnected) {
        console.warn('[SignalR] state drift detected (hub=' + hubState + ') - forcing reconnect');
        this._isConnected.set(false);
        await this.refreshConnection();
      }
    }, SignalRService.HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      const hasToken = !!this.localStorageService.get(StorageKeys.TOKEN);
      if (!hasToken) return;
      if (this._isConnected() || this.isStarting) return;

      console.warn('[SignalR] watchdog: disconnected with valid token present - attempting startConnection');
      void this.startConnection();
    }, SignalRService.WATCHDOG_INTERVAL_MS);
  }

  private stopWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      if (!payload) return true;

      const decoded = JSON.parse(atob(payload));
      if (!decoded.exp) return false;

      const expirationTime = decoded.exp * 1000;
      return Date.now() > expirationTime - SignalRService.TOKEN_EXPIRY_BUFFER_MS;
    } catch {
      return true;
    }
  }
}
