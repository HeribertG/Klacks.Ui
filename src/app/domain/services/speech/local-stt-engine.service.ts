// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared state and actions of the local (self-hosted) speech recognition engine: status of the plugin from the
 * updater hand-off queue, install, uninstall and discarding a stuck request. One polling loop runs while an
 * operation is active and at least one consumer (settings card) is attached. A failed status request keeps the
 * last known status; after MAX_CONSECUTIVE_FAILURES failures in a row the poll stops until a manual refresh succeeds.
 * Responses are applied latest-request-wins so a slow older response never overwrites a newer one. An uninstall first
 * flushes pending settings so the backend sees the persisted engine it resets to the browser engine. The default
 * engine follows the backend rule (native: Parakeet; Docker: Parakeet when the installation language is covered,
 * otherwise Whisper large-v3-turbo) using the installation default language loaded on attach.
 * @param status - Latest plugin status including active/last operation and the aliases this installation supports
 * @param busy - True while an install, uninstall or discard request is being sent
 * @param actionMessage - Reason returned by the last enqueue request
 * @param rejectionReason - Reason of the last enqueue request when the queue refused it, otherwise empty
 * @param consumers - Number of attached consumers; polling stops when the last one detaches
 * @param pollingSuspended - True once the status could not be loaded repeatedly; the shown status may be stale
 * @param installationLanguage - Installation default language, null until loaded or when it could not be loaded
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DataManagementUpdateService } from 'src/app/domain/services/update/data-management-update.service';
import { DataLanguageConfigService } from 'src/app/infrastructure/api/settings/data-language-config.service';
import { UpdateQueueHealthService } from 'src/app/domain/services/update/update-queue-health.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { LocalSttAllAliases, LocalSttEngineNames } from 'src/app/domain/constants/local-stt-plugin.constants';
import { WhisperModelAliases } from 'src/app/domain/constants/whisper-model-aliases.constants';
import { resolveDefaultLocalSttAlias } from 'src/app/domain/helpers/local-stt-default-alias.helper';
import { WhisperOperationStatuses, WhisperOperationTypes } from 'src/app/domain/constants/whisper-operation.constants';
import { WhisperModelAlias } from 'src/app/domain/models/assistant/whisper-model-alias.type';
import { LocalSttStatusView } from 'src/app/domain/models/assistant/local-stt-status-view.interface';
import { WhisperOperationInfo } from 'src/app/domain/models/assistant/whisper-operation-info.interface';
import { WhisperOperationResult } from 'src/app/domain/models/assistant/whisper-operation-result.interface';
import { WhisperPluginStatus } from 'src/app/domain/models/assistant/whisper-plugin-status.interface';

const POLL_INTERVAL_MS = 5000;
const MAX_CONSECUTIVE_FAILURES = 3;

@Injectable({ providedIn: 'root' })
export class LocalSttEngineService {
  private readonly dataUpdateService = inject(DataManagementUpdateService);
  private readonly queueHealth = inject(UpdateQueueHealthService);
  private readonly appSettings = inject(AppSettingsManagementService);
  private readonly languageConfig = inject(DataLanguageConfigService);

  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private consumers = 0;
  private requestSequence = 0;
  private consecutiveFailures = 0;

  public readonly status = signal<WhisperPluginStatus | null>(null);
  public readonly busy = signal(false);
  public readonly actionMessage = signal('');
  public readonly rejectionReason = signal('');
  public readonly pollingSuspended = signal(false);
  public readonly installationLanguage = signal<string | null>(null);

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

  public readonly supportedAliases = computed<readonly string[]>(() => {
    const s = this.status();
    if (!s) {
      return [];
    }
    return s.supportedAliases ?? LocalSttAllAliases;
  });

  public readonly defaultAlias = computed<WhisperModelAlias>(() =>
    resolveDefaultLocalSttAlias(
      this.supportedAliases(),
      this.status()?.parakeetLanguages,
      this.installationLanguage(),
    ),
  );

  public readonly defaultEngineName = computed(
    () => LocalSttEngineNames[this.defaultAlias()] ?? this.defaultAlias(),
  );

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

  public readonly statusUnavailable = computed(() => !this.status() || this.pollingSuspended());

  public readonly statusView = computed<LocalSttStatusView>(() => ({
    known: !!this.status(),
    unavailable: this.statusUnavailable(),
    installed: this.isInstalled(),
    engineName: this.installedEngineName(),
    activeOperation: this.activeOperation(),
    installActive: this.installActive(),
    awaitingUpdater: this.awaitingUpdater(),
    waitingMinutes: this.waitingMinutes(),
    otherOperationActive: this.otherOperationActive(),
    failedInstall: this.failedInstall(),
  }));

  public async attach(): Promise<void> {
    this.consumers++;
    await Promise.all([this.refresh(), this.loadInstallationLanguage()]);
  }

  public detach(): void {
    this.consumers = Math.max(0, this.consumers - 1);
    if (this.consumers === 0) {
      this.stopPolling();
    }
  }

  public async refresh(): Promise<void> {
    this.consecutiveFailures = 0;
    await this.loadStatus();
  }

  public async install(alias: WhisperModelAlias): Promise<void> {
    await this.runAction(() => this.dataUpdateService.installWhisperPlugin(alias));
  }

  public async uninstall(): Promise<void> {
    await this.runAction(async () => {
      await this.appSettings.saveImmediately();
      return this.dataUpdateService.uninstallWhisperPlugin();
    });
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

  public async loadInstallationLanguage(): Promise<void> {
    try {
      const config = await firstValueFrom(this.languageConfig.getLanguageConfig());
      this.installationLanguage.set(config.defaultLanguage ?? null);
    } catch {
      this.installationLanguage.set(null);
    }
  }

  private async loadStatus(): Promise<void> {
    const sequence = ++this.requestSequence;
    const status = await this.dataUpdateService.getWhisperPluginStatus();
    if (sequence !== this.requestSequence) {
      return;
    }
    if (!status) {
      this.registerFailure();
      return;
    }
    this.consecutiveFailures = 0;
    this.pollingSuspended.set(false);
    this.status.set(status);
    this.syncPolling(status);
  }

  private registerFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this.pollingSuspended.set(true);
      this.stopPolling();
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
    this.pollHandle = setInterval(() => void this.loadStatus(), POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }
}
