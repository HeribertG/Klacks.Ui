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
  public scheduleChangeTracked$ = new Subject<IScheduleChangeNotification>();
  public collisionsDetected$ = new Subject<ICollisionListNotification>();
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
    
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      
      return;
    }

    const token = this.localStorageService.get(StorageKeys.TOKEN);
    
    if (!token) {
      
      return;
    }

    if (this.isTokenExpired(token)) {
      
      return;
    }

    const isValid = await this.validateTokenWithBackend(token);
    if (!isValid) {
      
      return;
    }

    const urlWithToken = `${this.hubUrl}?${SignalRConstants.QueryParams.AccessToken}=${encodeURIComponent(token)}`;
    

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

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.hubConnection!.start();
        const connectionId = await this.hubConnection!.invoke<string>(SignalRConstants.HubMethods.GetConnectionId);
        this._connectionId.set(connectionId);
        this._isConnected.set(true);
        
        
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
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          
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
      
      this.currentGroup = { startDate, endDate };
      return;
    }

    if (this.currentGroup) {
      await this.leaveScheduleGroup(this.currentGroup.startDate, this.currentGroup.endDate);
    }

    try {
      await this.hubConnection.invoke(SignalRConstants.HubMethods.JoinScheduleGroup, startDate, endDate);
      this.currentGroup = { startDate, endDate };
      
    } catch {
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
      
    } catch {
      // ignored
    }
  }

  async rejoinCurrentGroup(): Promise<void> {
    
    if (this.currentGroup && this.isConnected) {
      const { startDate, endDate } = this.currentGroup;
      this.currentGroup = null;
      
      await this.joinScheduleGroup(startDate, endDate);
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

      if (this.reconnectAttemptWithExpiredToken) {
        
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
          
        }
      }
    } catch {
      // ignored
    }
  }

  private scheduleConnectionRefresh(): void {
    setTimeout(async () => {
      const token = this.localStorageService.get(StorageKeys.TOKEN);
      if (token && !this.isTokenExpired(token)) {
        
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
    this.scheduleChangeTracked$.complete();
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
