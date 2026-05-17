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
}

export interface AutoWizardCancelResponse {
  cancelled: boolean;
}

@Injectable({ providedIn: 'root' })
export class DataAutoWizardService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly localStorage = inject(LocalStorageService);
  private readonly translateService = inject(TranslateService);

  readonly status = signal<AutoWizardStatus>('idle');
  readonly result = signal<AutoWizardResult | null>(null);
  readonly failureReason = signal<string | null>(null);
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
      await this.hubConnection?.send(AutoWizardSignalRConstants.HubMethods.JoinJob, response.jobId);
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
    if (!this.hubConnection) {
      return;
    }

    const jobId = this.currentJobId();
    if (jobId) {
      try {
        await this.hubConnection.send(AutoWizardSignalRConstants.HubMethods.LeaveJob, jobId);
      } catch {
        // Connection may already be down; ignore.
      }
    }

    await this.hubConnection.stop();
    this.hubConnection = null;
  }

  ngOnDestroy(): void {
    void this.stopConnection();
  }

  private resetState(): void {
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
      throw new Error('Missing auth token; cannot connect to auto wizard hub.');
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.localStorage.get(StorageKeys.TOKEN) ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.registerHandlers(this.hubConnection);

    this.hubConnection.onreconnected(async () => {
      const jobId = this.currentJobId();
      if (jobId && this.hubConnection) {
        try {
          await this.hubConnection.send(AutoWizardSignalRConstants.HubMethods.JoinJob, jobId);
        } catch {
          // Best effort — connection may have dropped again.
        }
      }
    });

    const startTimeoutMs = 20000;
    await Promise.race([
      this.hubConnection.start(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`hub.start() did not resolve within ${startTimeoutMs}ms`)), startTimeoutMs),
      ),
    ]);
  }

  private registerHandlers(connection: signalR.HubConnection): void {
    connection.on(AutoWizardSignalRConstants.Events.OnCompleted, (result: AutoWizardResult) => {
      this.result.set(result);
      this.currentJobId.set(result.jobId);
      this.status.set('completed');
    });

    connection.on(AutoWizardSignalRConstants.Events.OnFailed, (reason: string) => {
      this.failureReason.set(this.normaliseReason(reason));
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
