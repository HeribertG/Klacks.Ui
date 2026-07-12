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
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../../storage/local-storage.service';
import { StorageKeys } from '../../constants/storage-keys';
import { WizardSignalRConstants } from '../../signalr/signalr.constants';
import {
  ApplyWizardResponse,
  CancelWizardResponse,
  StartWizardResponse,
  WizardApplyAsScenarioResponse,
  WizardRequest,
} from 'src/app/domain/models/wizard/wizard-request.model';
import {
  WizardProgress,
  WizardResult,
  WizardStatus,
} from 'src/app/domain/models/wizard/wizard-progress.model';
import { WizardJobStatusResponse } from 'src/app/domain/models/wizard/wizard-status.model';

@Injectable({ providedIn: 'root' })
export class DataWizardService implements OnDestroy {
  private static readonly HUB_START_TIMEOUT_MS = 20000;
  private static readonly APPLY_TIMEOUT_MS = 120000;

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

    try {
      await this.ensureConnected();

      const response = await firstValueFrom(
        this.http.post<StartWizardResponse>(`${this.apiBase}/Start`, request),
      );

      this.currentJobId.set(response.jobId);
      await this.joinJobGroup(response.jobId);
      return response.jobId;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : ((error as { message?: string } | null)?.message ?? String(error));
      this.failureReason.set(message);
      this.status.set('failed');
      throw error;
    }
  }

  async cancel(jobId: string): Promise<boolean> {
    const response = await firstValueFrom(
      this.http.post<CancelWizardResponse>(`${this.apiBase}/Cancel`, { jobId }),
    );
    return response.cancelled;
  }

  async apply(jobId: string): Promise<string[]> {
    const response = await firstValueFrom(
      this.http
        .post<ApplyWizardResponse>(`${this.apiBase}/Apply`, { jobId })
        .pipe(timeout(DataWizardService.APPLY_TIMEOUT_MS)),
    );
    return response.createdWorkIds;
  }

  async applyAsScenario(jobId: string, groupId: string | null): Promise<WizardApplyAsScenarioResponse> {
    const response = await firstValueFrom(
      this.http
        .post<WizardApplyAsScenarioResponse>(`${this.apiBase}/ApplyAsScenario`, { jobId, groupId })
        .pipe(timeout(DataWizardService.APPLY_TIMEOUT_MS)),
    );
    return response;
  }

  async stopConnection(): Promise<void> {
    const connection = this.hubConnection;
    if (!connection) {
      return;
    }
    this.hubConnection = null;

    const jobId = this.currentJobId();
    if (jobId) {
      try {
        await connection.send(WizardSignalRConstants.HubMethods.LeaveJob, jobId);
      } catch {
        // Ignore — connection may already be down.
      }
    }

    try {
      await connection.stop();
    } catch {
      // Ignore — connection may already be down.
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
        this.http.get<WizardJobStatusResponse>(`${this.apiBase}/Status/${jobId}`),
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
          this.failureReason.set(state.reason ?? 'Wizard job failed.');
          this.status.set('failed');
          return true;
        case 'unknown':
          this.failureReason.set('Wizard job is no longer tracked by the server.');
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
    await connection.send(WizardSignalRConstants.HubMethods.JoinJob, jobId);
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
      throw new Error('Missing auth token; cannot connect to wizard hub.');
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.localStorage.get(StorageKeys.TOKEN) ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.registerHandlers(connection);

    connection.onreconnected(async () => {
      const jobId = this.currentJobId();
      if (jobId && this.hubConnection === connection) {
        try {
          await connection.send(WizardSignalRConstants.HubMethods.JoinJob, jobId);
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
          this.failureReason.set('Connection to the wizard hub was lost.');
          this.status.set('failed');
        }
      })();
    });

    this.hubConnection = connection;

    await Promise.race([
      connection.start(),
      new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error(`hub.start() did not resolve within ${DataWizardService.HUB_START_TIMEOUT_MS}ms (state=${connection.state})`)),
          DataWizardService.HUB_START_TIMEOUT_MS,
        ),
      ),
    ]);
  }

  private registerHandlers(connection: signalR.HubConnection): void {
    connection.on(WizardSignalRConstants.Events.OnProgress, (progress: WizardProgress) => {
      if (progress.jobId !== this.currentJobId()) {
        return;
      }
      this.progress.set(progress);
    });

    connection.on(WizardSignalRConstants.Events.OnCompleted, (result: WizardResult) => {
      if (result.jobId !== this.currentJobId()) {
        return;
      }
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
