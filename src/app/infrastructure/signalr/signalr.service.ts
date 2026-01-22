import { inject, Injectable, signal, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageKeys } from '../constants/storage-keys';
import { IWorkNotification } from 'src/app/domain/interfaces/work-notification.interface';
import { IShiftStatsNotification } from 'src/app/domain/interfaces/shift-stats-notification.interface';
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
  public shiftStatsUpdated$ = new Subject<IShiftStatsNotification>();
  public periodHoursUpdated$ = new Subject<IPeriodHoursNotification>();
  public periodHoursRecalculated$ = new Subject<IPeriodHoursRecalculatedNotification>();
  public reconnected$ = new Subject<void>();

  private currentGroup: { startDate: string; endDate: string } | null = null;

  constructor() {
    this.hubUrl = environment.baseUrl.replace('/api/backend/', '/hubs/work-notifications');
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

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => token,
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
        const connectionId = await this.hubConnection!.invoke<string>('GetConnectionId');
        this._connectionId.set(connectionId);
        this._isConnected.set(true);
        console.log('SignalR connected with ID:', connectionId);
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

  async joinScheduleGroup(startDate: string, endDate: string): Promise<void> {
    if (!this.hubConnection || !this.isConnected) {
      console.warn('SignalR: Cannot join group - not connected');
      return;
    }

    if (this.currentGroup) {
      await this.leaveScheduleGroup(this.currentGroup.startDate, this.currentGroup.endDate);
    }

    try {
      await this.hubConnection.invoke('JoinScheduleGroup', startDate, endDate);
      this.currentGroup = { startDate, endDate };
      console.log(`SignalR: Joined group schedule_${startDate}_${endDate}`);
    } catch (error) {
      console.error('SignalR: Failed to join group', error);
    }
  }

  async leaveScheduleGroup(startDate: string, endDate: string): Promise<void> {
    if (!this.hubConnection || !this.isConnected) {
      return;
    }

    try {
      await this.hubConnection.invoke('LeaveScheduleGroup', startDate, endDate);
      if (this.currentGroup?.startDate === startDate && this.currentGroup?.endDate === endDate) {
        this.currentGroup = null;
      }
      console.log(`SignalR: Left group schedule_${startDate}_${endDate}`);
    } catch (error) {
      console.error('SignalR: Failed to leave group', error);
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

    this.hubConnection.on('WorkCreated', (notification: IWorkNotification) => {
      this.workCreated$.next(notification);
    });

    this.hubConnection.on('WorkUpdated', (notification: IWorkNotification) => {
      this.workUpdated$.next(notification);
    });

    this.hubConnection.on('WorkDeleted', (notification: IWorkNotification) => {
      this.workDeleted$.next(notification);
    });

    this.hubConnection.on('ShiftStatsUpdated', (notification: IShiftStatsNotification) => {
      this.shiftStatsUpdated$.next(notification);
    });

    this.hubConnection.on('PeriodHoursUpdated', (notification: IPeriodHoursNotification) => {
      this.periodHoursUpdated$.next(notification);
    });

    this.hubConnection.on('PeriodHoursRecalculated', (notification: IPeriodHoursRecalculatedNotification) => {
      this.periodHoursRecalculated$.next(notification);
    });
  }

  private registerConnectionEvents(): void {
    if (!this.hubConnection) return;

    this.hubConnection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
      this._isConnected.set(false);
    });

    this.hubConnection.onreconnected(async (connectionId) => {
      console.log('SignalR reconnected with ID:', connectionId);
      if (connectionId) {
        this._connectionId.set(connectionId);
      } else {
        const newId = await this.hubConnection?.invoke<string>('GetConnectionId');
        this._connectionId.set(newId || '');
      }
      this._isConnected.set(true);
      await this.rejoinCurrentGroup();
      this.reconnected$.next();
    });

    this.hubConnection.onclose(() => {
      console.log('SignalR connection closed');
      this._isConnected.set(false);
    });
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
