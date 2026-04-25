// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Facade service for SignalR: owns all event Subject streams and implements IScheduleSignalR.
 * Delegates connection lifecycle to SignalRConnectionHelper, group membership to SignalRGroupHelper
 * and token management to SignalRTokenHelper. Exposes telemetry and FSM state for diagnostics.
 */
import { inject, Injectable, OnDestroy, Signal } from '@angular/core';
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
import * as signalR from '@microsoft/signalr';
import { SignalRTokenHelper } from './signalr-token.helper';
import { SignalRGroupHelper } from './signalr-group.helper';
import { SignalRConnectionHelper } from './signalr-connection.helper';
import {
  jitter,
  SignalRConnectionState,
  SignalRTelemetry,
} from './signalr-connection-state';

@Injectable({
  providedIn: 'root',
})
export class SignalRService implements OnDestroy, IScheduleSignalR {
  private readonly _localStorage = inject(LocalStorageService);

  private readonly _tokenHelper: SignalRTokenHelper;
  private readonly _groupHelper: SignalRGroupHelper;
  private readonly _connectionHelper: SignalRConnectionHelper;

  private reconnectAttemptWithExpiredToken = false;
  private tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private fullReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private fullReconnectInFlight = false;

  private static readonly TOKEN_REFRESH_CHECK_INTERVAL_MS = 60000;
  private static readonly CONNECTION_REFRESH_DELAY_MS = 1000;
  private static readonly RECONNECT_DELAYS_MS: readonly number[] = [
    2000, 5000, 10000, 30000, 60000,
  ];

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

  constructor() {
    this._tokenHelper = new SignalRTokenHelper(this._localStorage);

    const hubUrl = environment.baseUrl.replace('/api/backend/', SignalRConstants.HubPath);

    this._connectionHelper = new SignalRConnectionHelper(
      this._tokenHelper,
      this._localStorage,
      hubUrl,
      {
        onVisibilityDrift: async () => await this.refreshConnection(),
        onWatchdogNeedsReconnect: async () => await this.startConnection(),
      },
    );

    this._groupHelper = new SignalRGroupHelper(
      () => this._connectionHelper.hubConnection,
      () => this._connectionHelper.isConnected(),
    );
  }

  get connectionId(): string {
    return this._connectionHelper.connectionId();
  }

  get isConnected(): boolean {
    return this._connectionHelper.isConnected();
  }

  get state(): Signal<SignalRConnectionState> {
    return this._connectionHelper.state;
  }

  get telemetry(): SignalRTelemetry {
    return this._connectionHelper.telemetry;
  }

  async startConnection(): Promise<void> {
    await this._connectionHelper.startConnection(
      (hub) => this.registerEventHandlers(hub),
      {
        onConnected: async () => await this.onConnectionConnected(),
        onReconnecting: async () => await this.onConnectionReconnecting(),
        onReconnected: async (hub) => await this.onConnectionReconnected(hub),
        onClosed: () => this.onConnectionClosed(),
      },
    );
  }

  private async onConnectionConnected(): Promise<void> {
    this.startProactiveTokenRefresh();
    this._connectionHelper.startHealthCheck(async () => await this.refreshConnection());
    await this._groupHelper.flush();
  }

  private async onConnectionReconnecting(): Promise<void> {
    const token = this._localStorage.get(StorageKeys.TOKEN);
    if (token && this._tokenHelper.isTokenExpired(token)) {
      this.reconnectAttemptWithExpiredToken = true;
      await this._tokenHelper.attemptTokenRefresh();
    }
  }

  private async onConnectionReconnected(_hub: signalR.HubConnection): Promise<void> {
    if (this.reconnectAttemptWithExpiredToken) {
      const token = this._localStorage.get(StorageKeys.TOKEN);
      if (token && this._tokenHelper.isTokenExpired(token)) {
        this.scheduleConnectionRefresh();
      }
      this.reconnectAttemptWithExpiredToken = false;
    }
    await this._groupHelper.flush();
    this.reconnected$.next();
  }

  private onConnectionClosed(): void {
    this.reconnectAttemptWithExpiredToken = false;
    this.scheduleFullReconnect();
  }

  async stopConnection(): Promise<void> {
    this.stopProactiveTokenRefresh();
    await this._connectionHelper.stopConnection();
  }

  async refreshConnection(): Promise<void> {
    await this.stopConnection();
    await this.startConnection();
  }

  async joinScheduleGroup(
    startDate: string,
    endDate: string,
    analyseToken: string | null = null,
  ): Promise<void> {
    await this._groupHelper.joinScheduleGroup(startDate, endDate, analyseToken);
  }

  async leaveScheduleGroup(
    startDate: string,
    endDate: string,
    analyseToken: string | null = null,
  ): Promise<void> {
    await this._groupHelper.leaveScheduleGroup(startDate, endDate, analyseToken);
  }

  async setSelectedGroup(selectedGroupId: string): Promise<void> {
    await this._groupHelper.setSelectedGroup(selectedGroupId);
  }

  async rejoinCurrentGroup(): Promise<void> {
    await this._groupHelper.rejoinCurrentGroup();
  }

  async ngOnDestroy(): Promise<void> {
    this.stopProactiveTokenRefresh();
    if (this.fullReconnectTimer) {
      clearTimeout(this.fullReconnectTimer);
      this.fullReconnectTimer = null;
    }
    this._connectionHelper.dispose();
    try {
      await this._connectionHelper.stopConnection();
    } catch {
      // ignored: stop is best-effort during teardown
    }
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

  private registerEventHandlers(hub: signalR.HubConnection): void {
    const onPush = <T>(subject: Subject<T>) => (notification: T) => {
      this._connectionHelper.notePush();
      subject.next(notification);
    };

    hub.on(SignalRConstants.Events.WorkCreated, onPush(this.workCreated$));
    hub.on(SignalRConstants.Events.WorkUpdated, onPush(this.workUpdated$));
    hub.on(SignalRConstants.Events.WorkDeleted, onPush(this.workDeleted$));
    hub.on(SignalRConstants.Events.ScheduleUpdated, onPush(this.scheduleUpdated$));
    hub.on(SignalRConstants.Events.ShiftStatsUpdated, onPush(this.shiftStatsUpdated$));
    hub.on(SignalRConstants.Events.PeriodHoursUpdated, onPush(this.periodHoursUpdated$));
    hub.on(SignalRConstants.Events.PeriodHoursRecalculated, onPush(this.periodHoursRecalculated$));
    hub.on(SignalRConstants.Events.ScheduleChangeTracked, onPush(this.scheduleChangeTracked$));
    hub.on(SignalRConstants.Events.CollisionsDetected, onPush(this.collisionsDetected$));
    hub.on(SignalRConstants.Events.ScheduleValidationsDetected, onPush(this.scheduleValidationsDetected$));
  }

  private startProactiveTokenRefresh(): void {
    this.stopProactiveTokenRefresh();
    this.tokenRefreshTimer = setInterval(async () => {
      const token = this._localStorage.get(StorageKeys.TOKEN);
      if (token && this._tokenHelper.isTokenExpired(token)) {
        await this._tokenHelper.attemptTokenRefresh();
        const refreshedToken = this._localStorage.get(StorageKeys.TOKEN);
        if (
          refreshedToken &&
          !this._tokenHelper.isTokenExpired(refreshedToken) &&
          this._connectionHelper.isConnected()
        ) {
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

  private scheduleConnectionRefresh(): void {
    setTimeout(async () => {
      const token = this._localStorage.get(StorageKeys.TOKEN);
      if (token && !this._tokenHelper.isTokenExpired(token)) {
        await this.refreshConnection();
      }
    }, SignalRService.CONNECTION_REFRESH_DELAY_MS);
  }

  private scheduleFullReconnect(attempt = 0): void {
    if (this.fullReconnectTimer || this.fullReconnectInFlight) {
      return;
    }

    const baseDelay =
      SignalRService.RECONNECT_DELAYS_MS[
        Math.min(attempt, SignalRService.RECONNECT_DELAYS_MS.length - 1)
      ];
    const delay = jitter(baseDelay);

    this.fullReconnectTimer = setTimeout(async () => {
      this.fullReconnectTimer = null;
      this.fullReconnectInFlight = true;

      try {
        let token = this._localStorage.get(StorageKeys.TOKEN);
        if (!token) return;

        if (this._tokenHelper.isTokenExpired(token)) {
          await this._tokenHelper.attemptTokenRefresh();
          token = this._localStorage.get(StorageKeys.TOKEN);
          if (!token || this._tokenHelper.isTokenExpired(token)) {
            this.fullReconnectInFlight = false;
            this.scheduleFullReconnect(attempt + 1);
            return;
          }
        }

        try {
          await this.refreshConnection();
          if (!this._connectionHelper.isConnected()) {
            this.fullReconnectInFlight = false;
            this.scheduleFullReconnect(attempt + 1);
          }
        } catch {
          this.fullReconnectInFlight = false;
          this.scheduleFullReconnect(attempt + 1);
        }
      } finally {
        this.fullReconnectInFlight = false;
      }
    }, delay);
  }
}
