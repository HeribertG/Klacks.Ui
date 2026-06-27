// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * SignalR service for assistant notifications (proactive messages, onboarding prompts).
 * @param hubUrl - URL of the assistant notification hub
 */

import { inject, Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageKeys } from '../constants/storage-keys';
import { AssistantSignalRConstants } from './signalr.constants';
import { IProactiveMessage } from 'src/app/domain/interfaces/proactive-message.interface';
import { IAgentPlanUpdate } from 'src/app/domain/models/assistant/agent-plan.interface';
import { IEntityChanged } from 'src/app/domain/interfaces/entity-changed.interface';
import { IncomingMessage } from 'klacks-plugin-messaging';

@Injectable({
  providedIn: 'root',
})
export class AssistantSignalRService implements OnDestroy {
  private localStorageService = inject(LocalStorageService);

  private hubConnection: signalR.HubConnection | null = null;
  private readonly hubUrl: string;

  public proactiveMessage$ = new Subject<IProactiveMessage>();
  public onboardingPrompt$ = new Subject<IProactiveMessage>();
  public incomingMessage$ = new Subject<IncomingMessage>();
  public planUpdated$ = new Subject<IAgentPlanUpdate>();
  public entityChanged$ = new Subject<IEntityChanged>();

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

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.localStorageService.get(StorageKeys.TOKEN) ?? '',
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.registerEventHandlers();
    this.registerConnectionEvents();

    try {
      await this.hubConnection.start();
    } catch (error) {
      console.error('Assistant SignalR connection failed:', error);
      // A failed initial start() does not fire onclose, so automatic reconnect never kicks in
      // (e.g. the token was not ready yet at app init). Schedule an explicit retry so the proactive
      // channel recovers instead of staying dead for the whole session.
      this.scheduleReconnect();
    }
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = null;
    }
  }

  private isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
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

    this.hubConnection.on(
      AssistantSignalRConstants.Events.PluginEvent,
      (eventType: string, payload: unknown) => {
        if (eventType === 'messaging.incoming') {
          this.incomingMessage$.next(payload as IncomingMessage);
        }
      }
    );

    this.hubConnection.on(
      AssistantSignalRConstants.Events.PlanUpdated,
      (update: IAgentPlanUpdate) => {
        this.planUpdated$.next(update);
      }
    );

    this.hubConnection.on(
      AssistantSignalRConstants.Events.EntityChanged,
      (change: IEntityChanged) => {
        this.entityChanged$.next(change);
      }
    );
  }

  private registerConnectionEvents(): void {
    if (!this.hubConnection) return;

    this.hubConnection.onclose(() => {
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(attempt = 0): void {
    const delays = [2000, 5000, 10000, 30000, 60000];
    const delay = delays[Math.min(attempt, delays.length - 1)];

    setTimeout(async () => {
      const token = this.localStorageService.get(StorageKeys.TOKEN);
      if (!token) return;

      try {
        // Stop any lingering connection before building a new one. withAutomaticReconnect can keep
        // the old instance alive; nulling it without stopping leaks a second connection whose event
        // handlers keep firing, so every proactive message would arrive twice.
        if (this.hubConnection) {
          await this.hubConnection.stop();
        }
        this.hubConnection = null;
        await this.startConnection();
        if (!this.isConnected()) {
          this.scheduleReconnect(attempt + 1);
        }
      } catch {
        this.scheduleReconnect(attempt + 1);
      }
    }, delay);
  }

  ngOnDestroy(): void {
    this.stopConnection();
    this.proactiveMessage$.complete();
    this.onboardingPrompt$.complete();
    this.incomingMessage$.complete();
    this.planUpdated$.complete();
    this.entityChanged$.complete();
  }
}
