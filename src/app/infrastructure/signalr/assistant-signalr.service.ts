// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * SignalR service for assistant notifications (proactive messages, onboarding prompts, plan updates).
 * Owns the assistant event Subject streams and delegates the connection lifecycle to the shared
 * SignalRConnectionHelper (FSM, backend probe, token validation, single watchdog-driven reconnect).
 * This replaces the previous naive skipNegotiation/WebSockets-only implementation whose overlapping
 * scheduleReconnect chains stormed the server ("Failed to start the HttpConnection before stop()")
 * whenever the backend was slow to become ready (e.g. cold start on an empty database).
 * @param hubUrl - URL of the assistant notification hub
 */

import { inject, Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../storage/local-storage.service';
import { DataAuthService } from '../api/data-auth.service';
import { AssistantSignalRConstants } from './signalr.constants';
import { SignalRTokenHelper } from './signalr-token.helper';
import { SignalRConnectionHelper } from './signalr-connection.helper';
import { IProactiveMessage } from 'src/app/domain/interfaces/proactive-message.interface';
import { IProactiveInboxChanged } from 'src/app/domain/interfaces/proactive-inbox.interface';
import { IAgentPlanUpdate } from 'src/app/domain/models/assistant/agent-plan.interface';
import { IEntityChanged } from 'src/app/domain/interfaces/entity-changed.interface';
import { IncomingMessage } from 'klacks-plugin-messaging';

@Injectable({
  providedIn: 'root',
})
export class AssistantSignalRService implements OnDestroy {
  private readonly _localStorage = inject(LocalStorageService);
  private readonly _dataAuthService = inject(DataAuthService);

  private readonly _tokenHelper: SignalRTokenHelper;
  private readonly _connectionHelper: SignalRConnectionHelper;

  public proactiveMessage$ = new Subject<IProactiveMessage>();
  public onboardingPrompt$ = new Subject<IProactiveMessage>();
  public proactiveInboxChanged$ = new Subject<IProactiveInboxChanged>();
  public incomingMessage$ = new Subject<IncomingMessage>();
  public planUpdated$ = new Subject<IAgentPlanUpdate>();
  public entityChanged$ = new Subject<IEntityChanged>();

  constructor() {
    this._tokenHelper = new SignalRTokenHelper(this._localStorage, this._dataAuthService);

    const hubUrl = environment.baseUrl.replace(
      '/api/backend/',
      AssistantSignalRConstants.HubPath,
    );

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

  get isConnected(): boolean {
    return this._connectionHelper.isConnected();
  }

  async startConnection(): Promise<void> {
    await this._connectionHelper.startConnection(
      (hub) => this.registerEventHandlers(hub),
      {
        onConnected: async () => {
          this._connectionHelper.startHealthCheck(async () => await this.refreshConnection());
        },
        onReconnecting: async () => undefined,
        onReconnected: async () => undefined,
        onClosed: () => undefined,
      },
    );
  }

  async stopConnection(): Promise<void> {
    await this._connectionHelper.stopConnection();
  }

  async refreshConnection(): Promise<void> {
    await this.stopConnection();
    await this.startConnection();
  }

  resetAuthFailure(): void {
    this._connectionHelper.resetAuthFailure();
  }

  private registerEventHandlers(hub: signalR.HubConnection): void {
    hub.on(
      AssistantSignalRConstants.Events.ProactiveMessage,
      (message: IProactiveMessage) => {
        this._connectionHelper.notePush();
        this.proactiveMessage$.next(message);
      },
    );

    hub.on(
      AssistantSignalRConstants.Events.OnboardingPrompt,
      (message: IProactiveMessage) => {
        this._connectionHelper.notePush();
        this.onboardingPrompt$.next(message);
      },
    );

    hub.on(
      AssistantSignalRConstants.Events.ProactiveInboxChanged,
      (change: IProactiveInboxChanged) => {
        this._connectionHelper.notePush();
        this.proactiveInboxChanged$.next(change);
      },
    );

    hub.on(
      AssistantSignalRConstants.Events.PluginEvent,
      (eventType: string, payload: unknown) => {
        this._connectionHelper.notePush();
        if (eventType === 'messaging.incoming') {
          this.incomingMessage$.next(payload as IncomingMessage);
        }
      },
    );

    hub.on(
      AssistantSignalRConstants.Events.PlanUpdated,
      (update: IAgentPlanUpdate) => {
        this._connectionHelper.notePush();
        this.planUpdated$.next(update);
      },
    );

    hub.on(
      AssistantSignalRConstants.Events.EntityChanged,
      (change: IEntityChanged) => {
        this._connectionHelper.notePush();
        this.entityChanged$.next(change);
      },
    );
  }

  async ngOnDestroy(): Promise<void> {
    this._connectionHelper.dispose();
    try {
      await this._connectionHelper.stopConnection();
    } catch {
      // ignored: stop is best-effort during teardown
    }
    this.proactiveMessage$.complete();
    this.onboardingPrompt$.complete();
    this.proactiveInboxChanged$.complete();
    this.incomingMessage$.complete();
    this.planUpdated$.complete();
    this.entityChanged$.complete();
  }
}
