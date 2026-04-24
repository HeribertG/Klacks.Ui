// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Infrastructure service for the schedule autofill wizard.
 * Combines REST (start/cancel/apply) with SignalR (progress stream).
 * @param progress - Signal with the latest WizardProgress event
 * @param status - Signal with the job lifecycle state (idle/running/completed/cancelled/failed)
 * @param currentJobId - Signal with the currently tracked job id (or null)
 */

import { HttpClient } from '@angular/common/http';
import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../../storage/local-storage.service';
import { StorageKeys } from '../../constants/storage-keys';
import { WizardSignalRConstants } from '../../signalr/signalr.constants';
import {
  ApplyWizardResponse,
  CancelWizardResponse,
  StartWizardResponse,
  WizardRequest,
} from 'src/app/domain/models/wizard/wizard-request.model';
import {
  WizardProgress,
  WizardResult,
  WizardStatus,
} from 'src/app/domain/models/wizard/wizard-progress.model';

@Injectable({ providedIn: 'root' })
export class DataWizardService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly localStorage = inject(LocalStorageService);

  readonly progress = signal<WizardProgress | null>(null);
  readonly result = signal<WizardResult | null>(null);
  readonly status = signal<WizardStatus>('idle');
  readonly failureReason = signal<string | null>(null);
  readonly currentJobId = signal<string | null>(null);

  private hubConnection: signalR.HubConnection | null = null;
  private readonly hubUrl: string;
  private readonly apiBase: string;

  constructor() {
    this.apiBase = `${environment.baseUrl}Wizard`;
    this.hubUrl = environment.baseUrl.replace('/api/backend/', WizardSignalRConstants.HubPath);
  }

  async start(request: WizardRequest): Promise<string> {
    this.resetState();
    this.status.set('running');

    await this.ensureConnected();

    const response = await firstValueFrom(
      this.http.post<StartWizardResponse>(`${this.apiBase}/Start`, request),
    );

    this.currentJobId.set(response.jobId);
    await this.hubConnection?.send(WizardSignalRConstants.HubMethods.JoinJob, response.jobId);
    return response.jobId;
  }

  async cancel(jobId: string): Promise<boolean> {
    const response = await firstValueFrom(
      this.http.post<CancelWizardResponse>(`${this.apiBase}/Cancel`, { jobId }),
    );
    return response.cancelled;
  }

  async apply(jobId: string): Promise<string[]> {
    const response = await firstValueFrom(
      this.http.post<ApplyWizardResponse>(`${this.apiBase}/Apply`, { jobId }),
    );
    return response.createdWorkIds;
  }

  async stopConnection(): Promise<void> {
    if (!this.hubConnection) {
      return;
    }

    const jobId = this.currentJobId();
    if (jobId) {
      try {
        await this.hubConnection.send(WizardSignalRConstants.HubMethods.LeaveJob, jobId);
      } catch {
        // Ignore — connection may already be down.
      }
    }

    await this.hubConnection.stop();
    this.hubConnection = null;
  }

  ngOnDestroy(): void {
    void this.stopConnection();
  }

  private resetState(): void {
    this.progress.set(null);
    this.result.set(null);
    this.failureReason.set(null);
    this.currentJobId.set(null);
  }

  private async ensureConnected(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const token = this.localStorage.get(StorageKeys.TOKEN);
    if (!token) {
      throw new Error('Missing auth token; cannot connect to wizard hub.');
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.localStorage.get(StorageKeys.TOKEN) ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.registerHandlers(this.hubConnection);
    await this.hubConnection.start();
  }

  private registerHandlers(connection: signalR.HubConnection): void {
    connection.on(WizardSignalRConstants.Events.OnProgress, (progress: WizardProgress) => {
      this.progress.set(progress);
    });

    connection.on(WizardSignalRConstants.Events.OnCompleted, (result: WizardResult) => {
      this.result.set(result);
      this.status.set('completed');
    });

    connection.on(WizardSignalRConstants.Events.OnCancelled, () => {
      this.status.set('cancelled');
    });

    connection.on(WizardSignalRConstants.Events.OnFailed, (reason: string) => {
      this.failureReason.set(reason);
      this.status.set('failed');
    });
  }
}
