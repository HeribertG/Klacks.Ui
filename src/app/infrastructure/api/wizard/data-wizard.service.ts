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
  WizardApplyAsScenarioResponse,
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
    console.log('[Wizard] start() begin', { agents: request.agentIds.length, shifts: request.shiftIds?.length, period: [request.periodFrom, request.periodUntil] });
    this.resetState();
    this.status.set('running');

    console.log('[Wizard] start() -> ensureConnected()');
    await this.ensureConnected();
    console.log('[Wizard] start() -> ensureConnected() done, posting /Wizard/Start');

    const t0 = Date.now();
    const response = await firstValueFrom(
      this.http.post<StartWizardResponse>(`${this.apiBase}/Start`, request),
    );
    console.log(`[Wizard] start() -> /Start returned in ${Date.now() - t0}ms, jobId=${response.jobId}`);

    this.currentJobId.set(response.jobId);
    console.log('[Wizard] start() -> sending JoinJob');
    await this.hubConnection?.send(WizardSignalRConstants.HubMethods.JoinJob, response.jobId);
    console.log('[Wizard] start() -> JoinJob sent, returning');
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

  async applyAsScenario(jobId: string, groupId: string | null): Promise<WizardApplyAsScenarioResponse> {
    const response = await firstValueFrom(
      this.http.post<WizardApplyAsScenarioResponse>(`${this.apiBase}/ApplyAsScenario`, { jobId, groupId }),
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
    console.log('[Wizard] ensureConnected: existing state=', this.hubConnection?.state);
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('[Wizard] ensureConnected: already connected, returning');
      return;
    }

    const token = this.localStorage.get(StorageKeys.TOKEN);
    if (!token) {
      throw new Error('Missing auth token; cannot connect to wizard hub.');
    }

    console.log('[Wizard] ensureConnected: building hub for url=', this.hubUrl);
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.localStorage.get(StorageKeys.TOKEN) ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Debug)
      .build();
    this.hubConnection.onclose((err) => console.log('[Wizard] hub.onclose:', err));
    this.hubConnection.onreconnecting((err) => console.log('[Wizard] hub.onreconnecting:', err));
    this.hubConnection.onreconnected((id) => console.log('[Wizard] hub.onreconnected:', id));

    this.registerHandlers(this.hubConnection);

    console.log('[Wizard] ensureConnected: calling hub.start() with 20s timeout');
    const startTimeoutMs = 20000;
    const t0 = Date.now();
    await Promise.race([
      this.hubConnection.start().then(() => console.log(`[Wizard] hub.start() resolved in ${Date.now() - t0}ms, state=${this.hubConnection?.state}`)),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`hub.start() did not resolve within ${startTimeoutMs}ms (state=${this.hubConnection?.state})`)), startTimeoutMs)
      ),
    ]);
    console.log('[Wizard] ensureConnected: done');
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
