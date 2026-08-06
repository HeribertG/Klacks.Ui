// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the auto-update backend domain (api/backend/update).
 * Provides status/history/config reads and trigger/rollback/cancel actions for the admin Updates card.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface IUpdateHistoryItem {
  id: string;
  operationType: string;
  status: string;
  channel: string;
  fromVersion: string;
  targetVersion: string;
  containsMigrations: boolean;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  message?: string;
}

export interface IUpdateAvailability {
  currentVersion: string;
  latestVersion: string;
  containsMigrations: boolean;
  isUpdateAvailable: boolean;
}

export interface IUpdateStatus {
  currentVersion: string;
  availability: IUpdateAvailability | null;
  activeOperation: IUpdateHistoryItem | null;
  lastOperation: IUpdateHistoryItem | null;
}

export interface IUpdateTriggerResult {
  enqueued: boolean;
  operationId?: string;
  reason: string;
}

export interface IUpdateConfig {
  autoEnabled: boolean;
  channel: string;
  checkIntervalHours: number;
  maintenanceWindowStart: string;
  maintenanceWindowEnd: string;
  notifyOnly: boolean;
  backupRetentionCount: number;
  pinnedVersion: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataUpdateService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}update`;

  getStatus(): Observable<IUpdateStatus> {
    return this.httpClient.get<IUpdateStatus>(`${this.baseUrl}/Status`).pipe(retry(3));
  }

  getHistory(take = 10): Observable<IUpdateHistoryItem[]> {
    return this.httpClient.get<IUpdateHistoryItem[]>(`${this.baseUrl}/History?take=${take}`).pipe(retry(3));
  }

  getConfig(): Observable<IUpdateConfig> {
    return this.httpClient.get<IUpdateConfig>(`${this.baseUrl}/Config`).pipe(retry(3));
  }

  saveConfig(config: IUpdateConfig): Observable<IUpdateConfig> {
    return this.httpClient.put<IUpdateConfig>(`${this.baseUrl}/Config`, config).pipe(retry(1));
  }

  triggerUpdate(): Observable<IUpdateTriggerResult> {
    return this.httpClient.post<IUpdateTriggerResult>(`${this.baseUrl}/Trigger`, {});
  }

  rollbackUpdate(): Observable<IUpdateTriggerResult> {
    return this.httpClient.post<IUpdateTriggerResult>(`${this.baseUrl}/Rollback`, {});
  }

  cancelUpdate(id: string): Observable<void> {
    return this.httpClient.post<void>(`${this.baseUrl}/${id}/Cancel`, {});
  }

  deleteHistoryEntry(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.baseUrl}/${id}`);
  }
}
