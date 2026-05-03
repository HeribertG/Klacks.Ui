// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Infrastructure service for the schedule harmonizer (Wizard 2).
 * Combines REST (start/cancel/applyAsScenario) with SignalR (progress stream).
 * @param progress - Signal with the latest HarmonizerProgress event
 * @param result - Signal with the final HarmonizerResult, populated on completion
 * @param status - Signal with the job lifecycle state (idle/running/completed/cancelled/failed)
 * @param failureReason - Signal with the server-provided failure message, if any
 * @param currentJobId - Signal with the currently tracked job id (or null)
 */

import { HttpClient } from '@angular/common/http';
import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../../storage/local-storage.service';
import { StorageKeys } from '../../constants/storage-keys';
import { HarmonizerSignalRConstants } from '../../signalr/signalr.constants';
import {
  CancelHarmonizerResponse,
  HarmonizerApplyAsScenarioResponse,
  HarmonizerRequest,
  StartHarmonizerResponse,
} from 'src/app/domain/models/harmonizer/harmonizer-request.model';
import {
  HarmonizerProgress,
  HarmonizerResult,
  HarmonizerStatus,
} from 'src/app/domain/models/harmonizer/harmonizer-progress.model';

@Injectable({ providedIn: 'root' })
export class DataHarmonizerService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly localStorage = inject(LocalStorageService);

  readonly progress = signal<HarmonizerProgress | null>(null);
  readonly result = signal<HarmonizerResult | null>(null);
  readonly status = signal<HarmonizerStatus>('idle');
  readonly failureReason = signal<string | null>(null);
  readonly currentJobId = signal<string | null>(null);

  private hubConnection: signalR.HubConnection | null = null;
  private readonly hubUrl: string;
  private readonly apiBase: string;

  constructor() {
    this.apiBase = `${environment.baseUrl}Harmonizer`;
    this.hubUrl = environment.baseUrl.replace('/api/backend/', HarmonizerSignalRConstants.HubPath);
  }

  async start(request: HarmonizerRequest): Promise<string> {
    this.resetState();
    this.status.set('running');

    await this.ensureConnected();

    const response = await firstValueFrom(
      this.http.post<StartHarmonizerResponse>(`${this.apiBase}/Start`, request),
    );

    this.currentJobId.set(response.jobId);
    await this.hubConnection?.send(HarmonizerSignalRConstants.HubMethods.JoinJob, response.jobId);
    return response.jobId;
  }

  async cancel(jobId: string): Promise<boolean> {
    const response = await firstValueFrom(
      this.http.post<CancelHarmonizerResponse>(`${this.apiBase}/Cancel`, { jobId }),
    );
    return response.cancelled;
  }

  async applyAsScenario(jobId: string, groupId: string | null): Promise<HarmonizerApplyAsScenarioResponse> {
    const response = await firstValueFrom(
      this.http.post<HarmonizerApplyAsScenarioResponse>(`${this.apiBase}/ApplyAsScenario`, { jobId, groupId }),
    );
    return response;
  }

  async stopConnection(): Promise<void> {
    if (!this.hubConnection) {
      return;
    }

    const jobId = this.currentJobId();
    if (jobId) {
      try {
        await this.hubConnection.send(HarmonizerSignalRConstants.HubMethods.LeaveJob, jobId);
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
      throw new Error('Missing auth token; cannot connect to harmonizer hub.');
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.localStorage.get(StorageKeys.TOKEN) ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.registerHandlers(this.hubConnection);

    const startTimeoutMs = 20000;
    await Promise.race([
      this.hubConnection.start(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`hub.start() did not resolve within ${startTimeoutMs}ms`)), startTimeoutMs),
      ),
    ]);
  }

  private registerHandlers(connection: signalR.HubConnection): void {
    connection.on(HarmonizerSignalRConstants.Events.OnProgress, (progress: HarmonizerProgress) => {
      this.progress.set(progress);
    });

    connection.on(HarmonizerSignalRConstants.Events.OnCompleted, (result: HarmonizerResult) => {
      this.result.set(result);
      this.status.set('completed');
    });

    connection.on(HarmonizerSignalRConstants.Events.OnCancelled, () => {
      this.status.set('cancelled');
    });

    connection.on(HarmonizerSignalRConstants.Events.OnFailed, (reason: string) => {
      this.failureReason.set(reason);
      this.status.set('failed');
    });
  }
}
