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

@Injectable({
  providedIn: 'root',
})
export class SignalRService implements OnDestroy {
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
  public reconnected$ = new Subject<void>();

  private currentGroup: { startDate: string; endDate: string } | null = null;
  private pendingGroupSwitch: Promise<void> | null = null;
  private reconnectAttemptWithExpiredToken = false;

  constructor() {
    this.hubUrl = environment.baseUrl.replace('/api/backend/', SignalRConstants.HubPath);
  }

  get connectionId(): string {
    return this._connectionId();
  }

  get isConnected(): boolean {
    return this._isConnected();
  }

  async startConnection(): Promise<void> {
    console.log('SignalR: startConnection called');
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR: Already connected, skipping');
      return;
    }

    const token = this.localStorageService.get(StorageKeys.TOKEN);
    console.log('SignalR: Token from storage:', token ? `${token.substring(0, 50)}...` : 'NULL');
    if (!token) {
      console.warn('SignalR: No token available, skipping connection');
      return;
    }

    if (this.isTokenExpired(token)) {
      console.warn('SignalR: Token expired, skipping connection');
      return;
    }

    const isValid = await this.validateTokenWithBackend(token);
    if (!isValid) {
      console.warn('SignalR: Token rejected by backend, skipping connection');
      return;
    }

    const urlWithToken = `${this.hubUrl}?${SignalRConstants.QueryParams.AccessToken}=${encodeURIComponent(token)}`;
    console.log('SignalR: Connecting to URL with token in query string');

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(urlWithToken, {
        accessTokenFactory: () => token,
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

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
          console.log('Backend health check passed');
          return;
        }
      } catch {
        // Backend not ready yet
      }

      if (attempt < maxAttempts - 1) {
        console.log(`Waiting for backend... (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    console.warn('Backend health check timed out, attempting SignalR connection anyway');
  }

  private async connectWithRetry(maxRetries = 5): Promise<void> {
    const retryDelays = [0, 1000, 2000, 5000, 10000];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.hubConnection!.start();
        const connectionId = await this.hubConnection!.invoke<string>(SignalRConstants.HubMethods.GetConnectionId);
        this._connectionId.set(connectionId);
        this._isConnected.set(true);
        console.log('SignalR connected with ID:', connectionId);
        console.log('SignalR: Checking for pending group to join, currentGroup:', this.currentGroup);
        await this.rejoinCurrentGroup();
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('401')) {
          this._isConnected.set(false);
          return;
        }

        const delay = retryDelays[attempt] ?? 10000;
        if (attempt < maxRetries - 1) {
          console.log(`SignalR connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.warn('SignalR connection failed after all retries - backend may not be running');
          this._isConnected.set(false);
        }
      }
    }
  }

  async stopConnection(): Promise<void> {
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
      await this.joinScheduleGroup(previousGroup.startDate, previousGroup.endDate);
    }
  }

  async joinScheduleGroup(startDate: string, endDate: string): Promise<void> {
    if (this.pendingGroupSwitch) {
      await this.pendingGroupSwitch;
    }

    this.pendingGroupSwitch = this.performGroupSwitch(startDate, endDate);

    try {
      await this.pendingGroupSwitch;
    } finally {
      this.pendingGroupSwitch = null;
    }
  }

  private async performGroupSwitch(startDate: string, endDate: string): Promise<void> {
    if (!this.hubConnection || !this.isConnected) {
      console.warn('SignalR: Cannot join group - not connected, saving for later:', { startDate, endDate });
      this.currentGroup = { startDate, endDate };
      return;
    }

    if (this.currentGroup) {
      await this.leaveScheduleGroup(this.currentGroup.startDate, this.currentGroup.endDate);
    }

    try {
      await this.hubConnection.invoke(SignalRConstants.HubMethods.JoinScheduleGroup, startDate, endDate);
      this.currentGroup = { startDate, endDate };
      console.log(`SignalR: Joined group ${SignalRConstants.Groups.schedule(startDate, endDate)}, connectionId=${this._connectionId()}`);
    } catch (error) {
      console.error('SignalR: Failed to join group', error);
      this.currentGroup = { startDate, endDate };
    }
  }

  async leaveScheduleGroup(startDate: string, endDate: string): Promise<void> {
    if (!this.hubConnection || !this.isConnected) {
      return;
    }

    try {
      await this.hubConnection.invoke(SignalRConstants.HubMethods.LeaveScheduleGroup, startDate, endDate);
      if (this.currentGroup?.startDate === startDate && this.currentGroup?.endDate === endDate) {
        this.currentGroup = null;
      }
      console.log(`SignalR: Left group ${SignalRConstants.Groups.schedule(startDate, endDate)}`);
    } catch (error) {
      console.error('SignalR: Failed to leave group', error);
    }
  }

  async rejoinCurrentGroup(): Promise<void> {
    console.log('SignalR rejoinCurrentGroup called, currentGroup:', this.currentGroup, 'isConnected:', this.isConnected);
    if (this.currentGroup && this.isConnected) {
      const { startDate, endDate } = this.currentGroup;
      this.currentGroup = null;
      console.log('SignalR: Rejoining saved group:', { startDate, endDate });
      await this.joinScheduleGroup(startDate, endDate);
    }
  }

  private registerEventHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on(SignalRConstants.Events.WorkCreated, (notification: IWorkNotification) => {
      console.log('SignalR RECEIVED: WorkCreated', notification);
      this.workCreated$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.WorkUpdated, (notification: IWorkNotification) => {
      console.log('SignalR RECEIVED: WorkUpdated', notification);
      this.workUpdated$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.WorkDeleted, (notification: IWorkNotification) => {
      console.log('SignalR RECEIVED: WorkDeleted', notification);
      this.workDeleted$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.ScheduleUpdated, (notification: IScheduleNotification) => {
      console.log('SignalR RECEIVED: ScheduleUpdated', notification);
      this.scheduleUpdated$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.ShiftStatsUpdated, (notification: IShiftStatsNotification) => {
      this.shiftStatsUpdated$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.PeriodHoursUpdated, (notification: IPeriodHoursNotification) => {
      console.log(`[SignalR] RAW PeriodHoursUpdated received:`, notification);
      this.periodHoursUpdated$.next(notification);
    });

    this.hubConnection.on(SignalRConstants.Events.PeriodHoursRecalculated, (notification: IPeriodHoursRecalculatedNotification) => {
      this.periodHoursRecalculated$.next(notification);
    });
  }

  private registerConnectionEvents(): void {
    if (!this.hubConnection) return;

    this.hubConnection.onreconnecting(async () => {
      console.log('SignalR reconnecting...');
      this._isConnected.set(false);

      const token = this.localStorageService.get(StorageKeys.TOKEN);
      if (token && this.isTokenExpired(token)) {
        console.warn('SignalR: Token expired during reconnect - attempting silent refresh');
        this.reconnectAttemptWithExpiredToken = true;
        await this.attemptTokenRefresh();
      }
    });

    this.hubConnection.onreconnected(async (connectionId) => {
      console.log('SignalR reconnected with ID:', connectionId);

      if (this.reconnectAttemptWithExpiredToken) {
        const token = this.localStorageService.get(StorageKeys.TOKEN);
        if (token && this.isTokenExpired(token)) {
          console.warn('SignalR: Token still expired after reconnect - scheduling full refresh');
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

    this.hubConnection.onclose((error) => {
      console.log('SignalR connection closed', error);
      this._isConnected.set(false);

      if (this.reconnectAttemptWithExpiredToken) {
        console.warn('SignalR: Connection closed due to expired token - scheduling reconnect with fresh token');
        this.reconnectAttemptWithExpiredToken = false;
        this.scheduleConnectionRefresh();
      }
    });
  }

  private async attemptTokenRefresh(): Promise<void> {
    try {
      const refreshUrl = environment.baseUrl + 'Accounts/RefreshToken';
      const token = this.localStorageService.get(StorageKeys.TOKEN);

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          this.localStorageService.set(StorageKeys.TOKEN, data.token);
          console.log('SignalR: Token refreshed successfully');
        }
      }
    } catch (error) {
      console.warn('SignalR: Token refresh failed:', error);
    }
  }

  private scheduleConnectionRefresh(): void {
    setTimeout(async () => {
      const token = this.localStorageService.get(StorageKeys.TOKEN);
      if (token && !this.isTokenExpired(token)) {
        console.log('SignalR: Refreshing connection with new token');
        await this.refreshConnection();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.stopConnection();
    this.workCreated$.complete();
    this.workUpdated$.complete();
    this.workDeleted$.complete();
    this.shiftStatsUpdated$.complete();
    this.periodHoursUpdated$.complete();
    this.periodHoursRecalculated$.complete();
    this.reconnected$.complete();
  }

  private async validateTokenWithBackend(token: string): Promise<boolean> {
    try {
      const validateUrl = environment.baseUrl + 'Accounts/ValidateToken';
      console.log('SignalR: Validating token with backend at:', validateUrl);
      const response = await fetch(validateUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('SignalR: Token validation response:', response.ok, response.status);
      return response.ok;
    } catch (error) {
      console.error('SignalR: Token validation error:', error);
      return false;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      if (!payload) return true;

      const decoded = JSON.parse(atob(payload));
      if (!decoded.exp) return false;

      const expirationTime = decoded.exp * 1000;
      const bufferMs = 30000;
      return Date.now() > expirationTime - bufferMs;
    } catch {
      return true;
    }
  }
}
