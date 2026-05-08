// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Infrastructure service for Holistic Harmonizer (Wizard 3, LLM-driven schedule harmonizer).
 * Combines REST (start/cancel/applyAsScenario) with SignalR (progress + completion stream).
 * @param progress - Signal with the latest HolisticHarmonizerProgress event
 * @param result - Signal with the final HolisticHarmonizerRunResponse, populated on completion
 * @param status - Signal with the job lifecycle state (idle/running/completed/cancelled/failed)
 * @param failureReason - Signal with the server-provided failure message, if any
 * @param currentJobId - Signal with the currently tracked job id (or null)
 */

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../../storage/local-storage.service';
import { StorageKeys } from '../../constants/storage-keys';
import { HolisticHarmonizerSignalRConstants } from '../../signalr/signalr.constants';
import {
  CancelHolisticHarmonizerResponse,
  HolisticHarmonizerApplyRequest,
  HolisticHarmonizerApplyResponse,
  HolisticHarmonizerModelCheckResponse,
  HolisticHarmonizerProgress,
  HolisticHarmonizerRunRequest,
  HolisticHarmonizerRunResponse,
  HolisticHarmonizerStatus,
  StartHolisticHarmonizerResponse,
} from 'src/app/domain/models/holistic-harmonizer/holistic-harmonizer-run.model';

@Injectable({ providedIn: 'root' })
export class DataHolisticHarmonizerService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly localStorage = inject(LocalStorageService);

  readonly progress = signal<HolisticHarmonizerProgress | null>(null);
  readonly result = signal<HolisticHarmonizerRunResponse | null>(null);
  readonly status = signal<HolisticHarmonizerStatus>('idle');
  readonly failureReason = signal<string | null>(null);
  readonly currentJobId = signal<string | null>(null);

  private hubConnection: signalR.HubConnection | null = null;
  private readonly hubUrl: string;
  private readonly apiBase: string;

  constructor() {
    this.apiBase = `${environment.baseUrl}HolisticHarmonizer`;
    this.hubUrl = environment.baseUrl.replace('/api/backend/', HolisticHarmonizerSignalRConstants.HubPath);
  }

  async start(request: HolisticHarmonizerRunRequest): Promise<string> {
    this.resetState();
    this.status.set('running');

    try {
      await this.ensureConnected();

      const response = await firstValueFrom(
        this.http.post<StartHolisticHarmonizerResponse>(`${this.apiBase}/Start`, request),
      );

      this.currentJobId.set(response.jobId);
      await this.hubConnection?.send(HolisticHarmonizerSignalRConstants.HubMethods.JoinJob, response.jobId);
      return response.jobId;
    } catch (error) {
      const message = this.extractMessage(error);
      this.failureReason.set(message);
      this.status.set('failed');
      throw error;
    }
  }

  async cancel(jobId: string): Promise<boolean> {
    const response = await firstValueFrom(
      this.http.post<CancelHolisticHarmonizerResponse>(`${this.apiBase}/Cancel`, { jobId }),
    );
    return response.cancelled;
  }

  async applyAsScenario(jobId: string, groupId: string | null): Promise<HolisticHarmonizerApplyResponse> {
    const payload: HolisticHarmonizerApplyRequest = { jobId, groupId };
    return firstValueFrom(
      this.http.post<HolisticHarmonizerApplyResponse>(`${this.apiBase}/ApplyAsScenario`, payload),
    );
  }

  async checkAllModels(): Promise<HolisticHarmonizerModelCheckResponse> {
    return firstValueFrom(
      this.http.post<HolisticHarmonizerModelCheckResponse>(`${this.apiBase}/CheckAllModels`, {}),
    );
  }

  async stopConnection(): Promise<void> {
    if (!this.hubConnection) {
      return;
    }

    const jobId = this.currentJobId();
    if (jobId) {
      try {
        await this.hubConnection.send(HolisticHarmonizerSignalRConstants.HubMethods.LeaveJob, jobId);
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
      throw new Error('Missing auth token; cannot connect to holistic harmonizer hub.');
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
    connection.on(HolisticHarmonizerSignalRConstants.Events.OnProgress, (progress: HolisticHarmonizerProgress) => {
      this.progress.set(progress);
    });

    connection.on(HolisticHarmonizerSignalRConstants.Events.OnCompleted, (result: HolisticHarmonizerRunResponse) => {
      this.result.set(result);
      this.currentJobId.set(result.jobId);
      this.status.set('completed');
    });

    connection.on(HolisticHarmonizerSignalRConstants.Events.OnCancelled, () => {
      this.status.set('cancelled');
    });

    connection.on(HolisticHarmonizerSignalRConstants.Events.OnFailed, (reason: string) => {
      this.failureReason.set(reason);
      this.status.set('failed');
    });
  }

  private extractMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string') {
        return (body as { message: string }).message;
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }
}
