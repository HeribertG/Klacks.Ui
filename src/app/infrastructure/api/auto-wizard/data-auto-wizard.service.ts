// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Infrastructure service for the AutoWizard orchestrator (button-mode of the schedule wizard
 * action). Calls POST /AutoWizard/Start, opens a dedicated SignalR hub connection and exposes
 * the final completion / failure event as Angular signals so callers can show a single toast.
 * @param status - Signal with the orchestrator lifecycle state (idle / running / completed / failed)
 * @param result - Signal with the final AutoWizardResult, populated when the chain completes
 * @param failureReason - Signal with the server-provided failure message, if any
 * @param currentJobId - Signal with the currently tracked orchestrator job id (or null)
 */

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as signalR from '@microsoft/signalr';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from '../../storage/local-storage.service';
import { StorageKeys } from '../../constants/storage-keys';
import { QualificationGapDetail } from 'src/app/domain/models/schedule/qualification-gap.model';
import { AutoWizardSignalRConstants } from '../../signalr/signalr.constants';
import { AUTO_WIZARD_LIMITS } from './auto-wizard-limits.constants';

export type AutoWizardStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface AutoWizardStartRequest {
  periodFrom: string;
  periodUntil: string;
  agentIds: string[];
  shiftIds: string[];
  groupId: string | null;
  analyseToken: string | null;
  language: string | null;
  agentOrderIsUserDefined: boolean;
}

export interface AutoWizardStartResponse {
  jobId: string;
}

export interface AutoWizardResult {
  jobId: string;
  finalScenarioId: string | null;
  finalScenarioToken: string | null;
  finalScenarioName: string | null;
  elapsedMs: number;
  qualificationGaps?: QualificationGapDetail[];
}

/**
 * Reported when the chain stopped. A later stage failing does not mean the earlier ones produced
 * nothing - the partial scenario is kept and named here so the operator can still use it.
 */
export interface AutoWizardJobFailure {
  jobId: string;
  failedStage: string;
  reason: string;
  partialScenarioId: string | null;
  partialScenarioToken: string | null;
  partialScenarioName: string | null;
}

export interface AutoWizardCancelResponse {
  cancelled: boolean;
}

export interface AutoWizardJobStatusResponse {
  status: 'running' | 'completed' | 'cancelled' | 'failed' | 'unknown';
  result: AutoWizardResult | null;
  reason: string | null;
}

@Injectable({ providedIn: 'root' })
export class DataAutoWizardService implements OnDestroy {
  private static readonly HUB_START_TIMEOUT_MS = 20000;

  private readonly http = inject(HttpClient);
  private readonly localStorage = inject(LocalStorageService);
  private readonly translateService = inject(TranslateService);

  readonly status = signal<AutoWizardStatus>('idle');
  readonly result = signal<AutoWizardResult | null>(null);
  readonly failureReason = signal<string | null>(null);
  /** Scenario an aborted chain still produced, if any. */
  readonly partialResult = signal<AutoWizardJobFailure | null>(null);
  readonly currentJobId = signal<string | null>(null);

  private hubConnection: signalR.HubConnection | null = null;
  private readonly hubUrl: string;
  private readonly apiBase: string;

  constructor() {
    this.apiBase = `${environment.baseUrl}AutoWizard`;
    this.hubUrl = environment.baseUrl.replace('/api/backend/', AutoWizardSignalRConstants.HubPath);
  }

  async start(request: AutoWizardStartRequest): Promise<string> {
    this.resetState();
    this.status.set('running');

    try {
      await this.ensureConnected();

      const response = await firstValueFrom(
        this.http.post<AutoWizardStartResponse>(`${this.apiBase}/Start`, request),
      );

      this.currentJobId.set(response.jobId);
      await this.joinJobGroup(response.jobId);
      return response.jobId;
    } catch (error) {
      const message = this.extractMessage(error);
      this.failureReason.set(this.normaliseReason(message));
      this.status.set('failed');
      throw error;
    }
  }

  async cancel(jobId: string): Promise<boolean> {
    const response = await firstValueFrom(
      this.http.post<AutoWizardCancelResponse>(`${this.apiBase}/Cancel`, { jobId }),
    );
    return response.cancelled;
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
        await connection.send(AutoWizardSignalRConstants.HubMethods.LeaveJob, jobId);
      } catch {
        // Connection may already be down; ignore.
      }
    }

    try {
      await connection.stop();
    } catch {
      // Connection may already be down; ignore.
    }
  }

  ngOnDestroy(): void {
    void this.stopConnection();
  }

  private resetState(): void {
    this.result.set(null);
    this.failureReason.set(null);
    this.partialResult.set(null);
    this.currentJobId.set(null);
  }

  private async reconcileJobState(jobId: string): Promise<boolean> {
    try {
      const state = await firstValueFrom(
        this.http.get<AutoWizardJobStatusResponse>(`${this.apiBase}/Status/${jobId}`),
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
        case 'failed':
          this.failureReason.set(this.normaliseReason(state.reason));
          this.status.set('failed');
          return true;
        case 'unknown':
          this.failureReason.set(this.normaliseReason('AutoWizard job is no longer tracked by the server.'));
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
    await connection.send(AutoWizardSignalRConstants.HubMethods.JoinJob, jobId);
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
      throw new Error('Missing auth token; cannot connect to auto wizard hub.');
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
          await connection.send(AutoWizardSignalRConstants.HubMethods.JoinJob, jobId);
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
          this.failureReason.set(this.normaliseReason('Connection to the auto wizard hub was lost.'));
          this.status.set('failed');
        }
      })();
    });

    this.hubConnection = connection;

    await Promise.race([
      connection.start(),
      new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error(`hub.start() did not resolve within ${DataAutoWizardService.HUB_START_TIMEOUT_MS}ms`)),
          DataAutoWizardService.HUB_START_TIMEOUT_MS,
        ),
      ),
    ]);
  }

  private registerHandlers(connection: signalR.HubConnection): void {
    connection.on(AutoWizardSignalRConstants.Events.OnCompleted, (result: AutoWizardResult) => {
      if (result.jobId !== this.currentJobId()) {
        return;
      }
      this.result.set(result);
      this.status.set('completed');
    });

    connection.on(AutoWizardSignalRConstants.Events.OnFailed, (failure: AutoWizardJobFailure) => {
      if (failure.jobId !== this.currentJobId()) {
        return;
      }
      this.partialResult.set(failure.partialScenarioId ? failure : null);
      this.failureReason.set(this.normaliseReason(failure.reason));
      this.status.set('failed');
    });
  }

  private extractMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (body && typeof body === 'object') {
        const code = (body as { code?: unknown }).code;
        if (code === AUTO_WIZARD_LIMITS.tooLargeErrorCode) {
          const b = body as {
            agents?: number;
            shifts?: number;
            periodDays?: number;
            maxAgents?: number;
            maxShifts?: number;
            maxSlotProduct?: number;
          };
          return this.translate('autoWizard.toast.tooLarge', {
            agents: b.agents ?? 0,
            shifts: b.shifts ?? 0,
            days: b.periodDays ?? 0,
            maxAgents: b.maxAgents ?? AUTO_WIZARD_LIMITS.maxAgents,
            maxShifts: b.maxShifts ?? AUTO_WIZARD_LIMITS.maxShifts,
            maxSlotProduct: b.maxSlotProduct ?? AUTO_WIZARD_LIMITS.maxSlotProduct,
          });
        }
        if (typeof (body as { message?: unknown }).message === 'string') {
          return (body as { message: string }).message;
        }
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return '';
  }

  private normaliseReason(reason: string | null | undefined): string {
    const trimmed = (reason ?? '').trim();
    return trimmed.length > 0
      ? trimmed
      : this.translate('autoWizard.toast.failedUnknown', {});
  }

  private translate(key: string, params: Record<string, unknown>): string {
    const translated = this.translateService.instant(key, params);
    return typeof translated === 'string' && translated !== key ? translated : key;
  }
}
