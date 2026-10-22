// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared state and actions of the local (self-hosted) speech recognition engine: status of the plugin from the
 * updater hand-off queue, install, uninstall and discarding a stuck request. One polling loop runs while an
 * operation is active and at least one consumer (settings card) is attached. A failed status request keeps the
 * last known status and the running poll.
 * @param status - Latest plugin status including active/last operation and the aliases this installation supports
 * @param busy - True while an install, uninstall or discard request is being sent
 * @param actionMessage - Reason returned by the last enqueue request
 * @param rejectionReason - Reason of the last enqueue request when the queue refused it, otherwise empty
 * @param consumers - Number of attached consumers; polling stops when the last one detaches
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DataManagementUpdateService } from 'src/app/domain/services/update/data-management-update.service';
import { UpdateQueueHealthService } from 'src/app/domain/services/update/update-queue-health.service';
import { LocalSttEngineNames } from 'src/app/domain/constants/local-stt-plugin.constants';
import { WhisperModelAliases } from 'src/app/domain/constants/whisper-model-aliases.constants';
import { WhisperOperationStatuses, WhisperOperationTypes } from 'src/app/domain/constants/whisper-operation.constants';
import { WhisperModelAlias } from 'src/app/domain/models/assistant/whisper-model-alias.type';
import { WhisperOperationInfo } from 'src/app/domain/models/assistant/whisper-operation-info.interface';
import { WhisperOperationResult } from 'src/app/domain/models/assistant/whisper-operation-result.interface';
import { WhisperPluginStatus } from 'src/app/domain/models/assistant/whisper-plugin-status.interface';

const POLL_INTERVAL_MS = 5000;

@Injectable({ providedIn: 'root' })
export class LocalSttEngineService {
  private readonly dataUpdateService = inject(DataManagementUpdateService);
  private readonly queueHealth = inject(UpdateQueueHealthService);

  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private consumers = 0;

  public readonly status = signal<WhisperPluginStatus | null>(null);
  public readonly busy = signal(false);
  public readonly actionMessage = signal('');
  public readonly rejectionReason = signal('');

  public readonly isInstalled = computed(() => !!this.status()?.installed);

  public readonly installedAlias = computed(() => {
    const s = this.status();
    return s?.installed ? s.modelAlias : null;
  });

  public readonly installedEngineName = computed(() => {
    const alias = this.installedAlias();
    return alias ? (LocalSttEngineNames[alias] ?? alias) : '';
  });

  public readonly activeOperation = computed(() => this.status()?.activeOperation ?? null);

  public readonly installActive = computed(
    () => this.activeOperation()?.operationType === WhisperOperationTypes.Install,
  );

  public readonly uninstallActive = computed(
    () => this.activeOperation()?.operationType === WhisperOperationTypes.Uninstall,
  );

  public readonly otherOperationActive = computed(() => !!this.status()?.otherOperationActive);

  public readonly supportedAliases = computed(() => this.status()?.supportedAliases ?? []);

  public readonly supportsWhisper = computed(() =>
    this.supportedAliases().some((alias) => alias !== WhisperModelAliases.Parakeet),
  );

  public readonly awaitingUpdater = computed(() =>
    this.queueHealth.isAwaitingUpdater(this.activeOperation()),
  );

  public readonly waitingMinutes = computed(() =>
    this.queueHealth.waitingMinutes(this.activeOperation()),
  );

  public readonly actionsDisabled = computed(() => {
    const s = this.status();
    return this.busy() || !s || !!s.activeOperation || s.otherOperationActive;
  });

  public readonly failedInstall = computed<WhisperOperationInfo | null>(() => {
    const s = this.status();
    const last = s?.lastOperation;
    if (
      !s ||
      s.installed ||
      s.activeOperation ||
      !last ||
      last.operationType !== WhisperOperationTypes.Install ||
      last.status !== WhisperOperationStatuses.Failed
    ) {
      return null;
    }
    return last;
  });

  public async attach(): Promise<void> {
    this.consumers++;
    await this.refresh();
  }

  public detach(): void {
    this.consumers = Math.max(0, this.consumers - 1);
    if (this.consumers === 0) {
      this.stopPolling();
    }
  }

  public async refresh(): Promise<void> {
    const status = await this.dataUpdateService.getWhisperPluginStatus();
    if (!status) {
      return;
    }
    this.status.set(status);
    this.syncPolling(status);
  }

  public async install(alias: WhisperModelAlias): Promise<void> {
    await this.runAction(() => this.dataUpdateService.installWhisperPlugin(alias));
  }

  public async uninstall(): Promise<void> {
    await this.runAction(() => this.dataUpdateService.uninstallWhisperPlugin());
  }

  public async discardRequest(): Promise<void> {
    const operation = this.activeOperation();
    if (!operation) {
      return;
    }

    this.busy.set(true);
    try {
      await firstValueFrom(this.dataUpdateService.deleteHistoryEntry(operation.id));
      this.actionMessage.set('');
      this.rejectionReason.set('');
    } catch (error) {
      if (!(error instanceof HttpErrorResponse) || error.status !== HttpStatusCode.Conflict) {
        throw error;
      }
    } finally {
      await this.refresh();
      this.busy.set(false);
    }
  }

  private async runAction(action: () => Promise<WhisperOperationResult>): Promise<void> {
    this.busy.set(true);
    try {
      const result = await action();
      this.actionMessage.set(result.reason);
      this.rejectionReason.set(result.enqueued ? '' : result.reason);
      await this.refresh();
    } finally {
      this.busy.set(false);
    }
  }

  private syncPolling(status: WhisperPluginStatus): void {
    if (this.consumers > 0 && status.activeOperation) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  private startPolling(): void {
    if (this.pollHandle !== null) {
      return;
    }
    this.pollHandle = setInterval(() => void this.refresh(), POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }
}
