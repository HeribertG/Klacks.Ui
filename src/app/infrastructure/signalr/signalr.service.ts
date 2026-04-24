// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Facade service for SignalR: owns all event Subject streams and implements IScheduleSignalR.
 * Delegates connection lifecycle to SignalRConnectionHelper, group membership to SignalRGroupHelper
 * and token management to SignalRTokenHelper.
 */
import { inject, Injectable, OnDestroy } from '@angular/core';
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

  private static readonly TOKEN_REFRESH_CHECK_INTERVAL_MS = 60000;
  private static readonly CONNECTION_REFRESH_DELAY_MS = 1000;

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
    this._groupHelper = new SignalRGroupHelper();

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
  }

  get connectionId(): string {
    return this._connectionHelper.connectionId();
  }

  get isConnected(): boolean {
    return this._connectionHelper.isConnected();
  }

  async startConnection(): Promise<void> {
    await this._connectionHelper.startConnection(
      hub => this.registerEventHandlers(hub),
      {
        onConnected: async () => {
          this.startProactiveTokenRefresh();
          this._connectionHelper.startHealthCheck(async () => await this.refreshConnection());
          await this._groupHelper.rejoinCurrentGroup(
            this._connectionHelper.hubConnection!,
            this._connectionHelper.isConnected(),
          );
        },
        onReconnecting: async () => {
          const token = this._localStorage.get(StorageKeys.TOKEN);
          if (token && this._tokenHelper.isTokenExpired(token)) {
            this.reconnectAttemptWithExpiredToken = true;
            await this._tokenHelper.attemptTokenRefresh();
          }
        },
        onReconnected: async (hub: signalR.HubConnection) => {
          if (this.reconnectAttemptWithExpiredToken) {
            const token = this._localStorage.get(StorageKeys.TOKEN);
            if (token && this._tokenHelper.isTokenExpired(token)) {
              this.scheduleConnectionRefresh();
            }
            this.reconnectAttemptWithExpiredToken = false;
          }
          await this._groupHelper.rejoinCurrentGroup(hub, this._connectionHelper.isConnected());
          this.reconnected$.next();
        },
        onClosed: () => {
          this.reconnectAttemptWithExpiredToken = false;
          this.scheduleFullReconnect();
        },
      },
    );
  }

  async stopConnection(): Promise<void> {
    this.stopProactiveTokenRefresh();
    await this._connectionHelper.stopConnection();
  }

  async refreshConnection(): Promise<void> {
    const previousGroup = this._groupHelper.currentGroup;
    await this.stopConnection();
    await this.startConnection();
    if (previousGroup && this._connectionHelper.isConnected()) {
      await this._groupHelper.joinScheduleGroup(
        this._connectionHelper.hubConnection!,
        this._connectionHelper.isConnected(),
        previousGroup.startDate,
        previousGroup.endDate,
        previousGroup.analyseToken,
      );
    }
  }

  async joinScheduleGroup(
    startDate: string,
    endDate: string,
    analyseToken: string | null = null,
  ): Promise<void> {
    await this._groupHelper.joinScheduleGroup(
      this._connectionHelper.hubConnection!,
      this._connectionHelper.isConnected(),
      startDate, endDate, analyseToken,
    );
  }

  async leaveScheduleGroup(
    startDate: string,
    endDate: string,
    analyseToken: string | null = null,
  ): Promise<void> {
    await this._groupHelper.leaveScheduleGroup(
      this._connectionHelper.hubConnection!,
      this._connectionHelper.isConnected(),
      startDate, endDate, analyseToken,
    );
  }

  async setSelectedGroup(selectedGroupId: string): Promise<void> {
    await this._groupHelper.setSelectedGroup(
      this._connectionHelper.hubConnection!,
      this._connectionHelper.isConnected(),
      selectedGroupId,
    );
  }

  async rejoinCurrentGroup(): Promise<void> {
    await this._groupHelper.rejoinCurrentGroup(
      this._connectionHelper.hubConnection!,
      this._connectionHelper.isConnected(),
    );
  }

  ngOnDestroy(): void {
    this.stopProactiveTokenRefresh();
    this._connectionHelper.dispose();
    void this._connectionHelper.stopConnection();
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
    hub.on(SignalRConstants.Events.WorkCreated, (n: IWorkNotification) => this.workCreated$.next(n));
    hub.on(SignalRConstants.Events.WorkUpdated, (n: IWorkNotification) => this.workUpdated$.next(n));
    hub.on(SignalRConstants.Events.WorkDeleted, (n: IWorkNotification) => this.workDeleted$.next(n));
    hub.on(SignalRConstants.Events.ScheduleUpdated, (n: IScheduleNotification) => this.scheduleUpdated$.next(n));
    hub.on(SignalRConstants.Events.ShiftStatsUpdated, (n: IShiftStatsNotification) => this.shiftStatsUpdated$.next(n));
    hub.on(SignalRConstants.Events.PeriodHoursUpdated, (n: IPeriodHoursNotification) => this.periodHoursUpdated$.next(n));
    hub.on(SignalRConstants.Events.PeriodHoursRecalculated, (n: IPeriodHoursRecalculatedNotification) => this.periodHoursRecalculated$.next(n));
    hub.on(SignalRConstants.Events.ScheduleChangeTracked, (n: IScheduleChangeNotification) => this.scheduleChangeTracked$.next(n));
    hub.on(SignalRConstants.Events.CollisionsDetected, (n: ICollisionListNotification) => this.collisionsDetected$.next(n));
    hub.on(SignalRConstants.Events.ScheduleValidationsDetected, (n: IScheduleValidationListNotification) => this.scheduleValidationsDetected$.next(n));
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
    const delays = [2000, 5000, 10000, 30000, 60000];
    const delay = delays[Math.min(attempt, delays.length - 1)];

    setTimeout(async () => {
      let token = this._localStorage.get(StorageKeys.TOKEN);
      if (!token) return;

      if (this._tokenHelper.isTokenExpired(token)) {
        await this._tokenHelper.attemptTokenRefresh();
        token = this._localStorage.get(StorageKeys.TOKEN);
        if (!token || this._tokenHelper.isTokenExpired(token)) {
          this.scheduleFullReconnect(attempt + 1);
          return;
        }
      }

      try {
        await this.refreshConnection();
        if (!this._connectionHelper.isConnected()) {
          this.scheduleFullReconnect(attempt + 1);
        }
      } catch {
        this.scheduleFullReconnect(attempt + 1);
      }
    }, delay);
  }
}
