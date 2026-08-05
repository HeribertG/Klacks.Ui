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

import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../../storage/local-storage.service';
import { StorageKeys } from '../../constants/storage-keys';
import { HolisticHarmonizerSignalRConstants } from '../../signalr/signalr.constants';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
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
import { HolisticHarmonizerJobStatusResponse } from 'src/app/domain/models/holistic-harmonizer/holistic-harmonizer-status.model';

@Injectable({ providedIn: 'root' })
export class DataHolisticHarmonizerService implements OnDestroy {
  private static readonly HUB_START_TIMEOUT_MS = 20000;
  private static readonly APPLY_TIMEOUT_MS = 120000;

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
      await this.joinJobGroup(response.jobId);
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
      this.http
        .post<HolisticHarmonizerApplyResponse>(`${this.apiBase}/ApplyAsScenario`, payload)
        .pipe(timeout(DataHolisticHarmonizerService.APPLY_TIMEOUT_MS)),
    );
  }

  async checkAllModels(): Promise<HolisticHarmonizerModelCheckResponse> {
    return firstValueFrom(
      this.http.post<HolisticHarmonizerModelCheckResponse>(`${this.apiBase}/CheckAllModels`, {}, {
        context: new HttpContext().set(SKIP_LOADING, true),
      }),
    );
  }

  async stopConnection(): Promise<void> {
    const connection = this.hubConnection;
    if (!connection) {
      return;
    }

    // Clear the field first so concurrent callers never stop the same connection twice.
    this.hubConnection = null;

    const jobId = this.currentJobId();
    if (jobId) {
      try {
        await connection.send(HolisticHarmonizerSignalRConstants.HubMethods.LeaveJob, jobId);
      } catch {
        // Ignore — connection may already be down.
      }
    }

    try {
      await connection.stop();
    } catch {
      // Ignore — stopping an already dead connection is not an error for the caller.
    }
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

  private async reconcileJobState(jobId: string): Promise<boolean> {
    try {
      const state = await firstValueFrom(
        this.http.get<HolisticHarmonizerJobStatusResponse>(`${this.apiBase}/Status/${jobId}`),
      );
      if (jobId !== this.currentJobId() || this.status() !== 'running') {
        return false;
      }
      switch (state.status) {
        case 'completed':
          if (!state.result) {
            return false;
          }
          this.result.set(state.result);
          this.status.set('completed');
          return true;
        case 'cancelled':
          this.status.set('cancelled');
          return true;
        case 'failed':
          this.failureReason.set(state.reason ?? 'Holistic harmonizer job failed.');
          this.status.set('failed');
          return true;
        case 'unknown':
          this.failureReason.set('Holistic harmonizer job is no longer tracked by the server.');
          this.status.set('failed');
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private async joinJobGroup(jobId: string): Promise<void> {
    if (this.hubConnection?.state !== signalR.HubConnectionState.Connected) {
      await this.ensureConnected();
    }
    const connection = this.hubConnection;
    if (!connection) {
      throw new Error('Hub connection was closed before joining the job group.');
    }
    await connection.send(HolisticHarmonizerSignalRConstants.HubMethods.JoinJob, jobId);
  }

  private async ensureConnected(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const staleConnection = this.hubConnection;
    this.hubConnection = null;
    if (staleConnection) {
      staleConnection.stop().catch(() => undefined);
    }

    const token = this.localStorage.get(StorageKeys.TOKEN);
    if (!token) {
      throw new Error('Missing auth token; cannot connect to holistic harmonizer hub.');
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.localStorage.get(StorageKeys.TOKEN) ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.registerHandlers(connection);

    connection.onreconnected(async () => {
      const jobId = this.currentJobId();
      if (jobId && this.hubConnection === connection) {
        try {
          await connection.send(HolisticHarmonizerSignalRConstants.HubMethods.JoinJob, jobId);
        } catch {
          // Best effort — connection may have dropped again.
        }
        if (this.status() === 'running') {
          await this.reconcileJobState(jobId);
        }
      }
    });

    connection.onclose(() => {
      if (this.hubConnection !== connection) {
        return;
      }
      this.hubConnection = null;
      if (this.status() !== 'running') {
        return;
      }
      const jobId = this.currentJobId();
      void (async () => {
        const reconciled = jobId ? await this.reconcileJobState(jobId) : false;
        if (!reconciled && this.status() === 'running') {
          this.failureReason.set('Connection to the holistic harmonizer hub was lost.');
          this.status.set('failed');
        }
      })();
    });

    this.hubConnection = connection;

    await Promise.race([
      connection.start(),
      new Promise<void>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `hub.start() did not resolve within ${DataHolisticHarmonizerService.HUB_START_TIMEOUT_MS}ms`,
              ),
            ),
          DataHolisticHarmonizerService.HUB_START_TIMEOUT_MS,
        ),
      ),
    ]);
  }

  private registerHandlers(connection: signalR.HubConnection): void {
    connection.on(HolisticHarmonizerSignalRConstants.Events.OnProgress, (progress: HolisticHarmonizerProgress) => {
      if (progress.jobId !== this.currentJobId()) {
        return;
      }
      this.progress.set(progress);
    });

    connection.on(HolisticHarmonizerSignalRConstants.Events.OnCompleted, (result: HolisticHarmonizerRunResponse) => {
      if (result.jobId !== this.currentJobId()) {
        return;
      }
      this.result.set(result);
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
