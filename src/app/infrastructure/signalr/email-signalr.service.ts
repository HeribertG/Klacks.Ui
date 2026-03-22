// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * SignalR service for email notifications (new emails, read state changes).
 * @param hubUrl - URL of the email notification hub
 */

import { inject, Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageKeys } from '../constants/storage-keys';
import { EmailSignalRConstants } from './signalr.constants';
import { INewEmailsNotification, IEmailReadStateNotification } from 'src/app/domain/models/email/email-notification.model';

@Injectable({
  providedIn: 'root',
})
export class EmailSignalRService implements OnDestroy {
  private localStorageService = inject(LocalStorageService);

  private hubConnection: signalR.HubConnection | null = null;
  private readonly hubUrl: string;

  public newEmailsReceived$ = new Subject<INewEmailsNotification>();
  public emailReadStateChanged$ = new Subject<IEmailReadStateNotification>();

  constructor() {
    this.hubUrl = environment.baseUrl.replace('/api/backend/', EmailSignalRConstants.HubPath);
  }

  async startConnection(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const token = this.localStorageService.get(StorageKeys.TOKEN);
    if (!token) {
      return;
    }

    const urlWithToken = `${this.hubUrl}?${EmailSignalRConstants.QueryParams.AccessToken}=${encodeURIComponent(token)}`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(urlWithToken, {
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
      console.error('Email SignalR connection failed:', error);
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
      EmailSignalRConstants.Events.NewEmailsReceived,
      (notification: INewEmailsNotification) => {
        this.newEmailsReceived$.next(notification);
      },
    );

    this.hubConnection.on(
      EmailSignalRConstants.Events.EmailReadStateChanged,
      (notification: IEmailReadStateNotification) => {
        this.emailReadStateChanged$.next(notification);
      },
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
    this.newEmailsReceived$.complete();
    this.emailReadStateChanged$.complete();
  }
}
