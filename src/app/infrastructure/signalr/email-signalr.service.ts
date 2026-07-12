// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * SignalR service for email notifications (new emails, read state changes).
 * Owns the email event Subject streams and delegates the connection lifecycle to the shared
 * SignalRConnectionHelper (FSM, backend probe, token validation, single watchdog-driven reconnect).
 * This replaces the previous naive skipNegotiation/WebSockets-only implementation whose stacking
 * scheduleReconnect chains stormed the server whenever the backend was slow to become ready.
 * @param hubUrl - URL of the email notification hub
 */

import { inject, Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../storage/local-storage.service';
import { DataAuthService } from '../api/data-auth.service';
import { EmailSignalRConstants } from './signalr.constants';
import { SignalRTokenHelper } from './signalr-token.helper';
import { SignalRConnectionHelper } from './signalr-connection.helper';
import { INewEmailsNotification, IEmailReadStateNotification } from 'src/app/domain/models/email/email-notification.model';

@Injectable({
  providedIn: 'root',
})
export class EmailSignalRService implements OnDestroy {
  private readonly _localStorage = inject(LocalStorageService);
  private readonly _dataAuthService = inject(DataAuthService);

  private readonly _tokenHelper: SignalRTokenHelper;
  private readonly _connectionHelper: SignalRConnectionHelper;

  public newEmailsReceived$ = new Subject<INewEmailsNotification>();
  public emailReadStateChanged$ = new Subject<IEmailReadStateNotification>();

  constructor() {
    this._tokenHelper = new SignalRTokenHelper(this._localStorage, this._dataAuthService);

    const hubUrl = environment.baseUrl.replace(
      '/api/backend/',
      EmailSignalRConstants.HubPath,
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
      EmailSignalRConstants.Events.NewEmailsReceived,
      (notification: INewEmailsNotification) => {
        this._connectionHelper.notePush();
        this.newEmailsReceived$.next(notification);
      },
    );

    hub.on(
      EmailSignalRConstants.Events.EmailReadStateChanged,
      (notification: IEmailReadStateNotification) => {
        this._connectionHelper.notePush();
        this.emailReadStateChanged$.next(notification);
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
    this.newEmailsReceived$.complete();
    this.emailReadStateChanged$.complete();
  }
}
