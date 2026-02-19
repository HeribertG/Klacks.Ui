import { inject, Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageKeys } from '../constants/storage-keys';
import { AssistantSignalRConstants } from './signalr.constants';
import { IProactiveMessage } from 'src/app/domain/interfaces/proactive-message.interface';

@Injectable({
  providedIn: 'root',
})
export class AssistantSignalRService implements OnDestroy {
  private localStorageService = inject(LocalStorageService);

  private hubConnection: signalR.HubConnection | null = null;
  private readonly hubUrl: string;

  public proactiveMessage$ = new Subject<IProactiveMessage>();
  public onboardingPrompt$ = new Subject<IProactiveMessage>();

  constructor() {
    this.hubUrl = environment.baseUrl.replace('/api/backend/', AssistantSignalRConstants.HubPath);
  }

  async startConnection(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const token = this.localStorageService.get(StorageKeys.TOKEN);
    if (!token) {
      return;
    }

    const urlWithToken = `${this.hubUrl}?${AssistantSignalRConstants.QueryParams.AccessToken}=${encodeURIComponent(token)}`;

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

    try {
      await this.hubConnection.start();
    } catch (error) {
      console.error('Assistant SignalR connection failed:', error);
    }
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = null;
    }
  }

  private registerEventHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on(
      AssistantSignalRConstants.Events.ProactiveMessage,
      (message: IProactiveMessage) => {
        this.proactiveMessage$.next(message);
      }
    );

    this.hubConnection.on(
      AssistantSignalRConstants.Events.OnboardingPrompt,
      (message: IProactiveMessage) => {
        this.onboardingPrompt$.next(message);
      }
    );
  }

  ngOnDestroy(): void {
    this.stopConnection();
    this.proactiveMessage$.complete();
    this.onboardingPrompt$.complete();
  }
}
