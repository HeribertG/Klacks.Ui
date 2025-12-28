import { inject, Injectable, signal, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageKeys } from '../constants/storage-keys';
import { IWorkNotification } from 'src/app/domain/interfaces/work-notification.interface';
import { IShiftStatsNotification } from 'src/app/domain/interfaces/shift-stats-notification.interface';

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

  constructor() {
    this.hubUrl = environment.baseUrl.replace('/api/v1/backend/', '/hubs/work-notifications');
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

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
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
    const healthUrl = environment.baseUrl.replace('/api/v1/backend/', '/health');

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
      } catch {
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
  }
}
