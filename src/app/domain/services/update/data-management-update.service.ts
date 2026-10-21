// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Domain service for the auto-update feature. Orchestrates access to the update backend so that
 * presentation components depend on the domain layer rather than the infrastructure HTTP service.
 * It also owns the queued Whisper plugin operations (install and uninstall), which are enqueued for the updater and
 * appear in the update history next to the application updates.
 */
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataUpdateService } from 'src/app/infrastructure/api/settings/data-update.service';
import { DataWhisperPluginService } from 'src/app/infrastructure/api/assistant/data-whisper-plugin.service';
import { WhisperModelAlias } from 'src/app/domain/models/assistant/whisper-model-alias.type';
import { WhisperOperationResult } from 'src/app/domain/models/assistant/whisper-operation-result.interface';
import { WhisperPluginStatus } from 'src/app/domain/models/assistant/whisper-plugin-status.interface';
import { IUpdateConfig } from 'src/app/domain/models/settings/update-config.interface';
import { IUpdateHistoryItem } from 'src/app/domain/models/settings/update-history-item.interface';
import { IUpdateStatus } from 'src/app/domain/models/settings/update-status.interface';
import { IUpdateTriggerResult } from 'src/app/domain/models/settings/update-trigger-result.interface';

@Injectable({
  providedIn: 'root',
})
export class DataManagementUpdateService {
  private api = inject(DataUpdateService);
  private whisperPlugin = inject(DataWhisperPluginService);

  getStatus(): Observable<IUpdateStatus> {
    return this.api.getStatus();
  }

  getHistory(take?: number): Observable<IUpdateHistoryItem[]> {
    return this.api.getHistory(take);
  }

  getConfig(): Observable<IUpdateConfig> {
    return this.api.getConfig();
  }

  saveConfig(config: IUpdateConfig): Observable<IUpdateConfig> {
    return this.api.saveConfig(config);
  }

  triggerUpdate(): Observable<IUpdateTriggerResult> {
    return this.api.triggerUpdate();
  }

  rollbackUpdate(): Observable<IUpdateTriggerResult> {
    return this.api.rollbackUpdate();
  }

  cancelUpdate(id: string): Observable<void> {
    return this.api.cancelUpdate(id);
  }

  deleteHistoryEntry(id: string): Observable<void> {
    return this.api.deleteHistoryEntry(id);
  }

  getWhisperPluginStatus(): Promise<WhisperPluginStatus | null> {
    return this.whisperPlugin.getStatus();
  }

  installWhisperPlugin(modelAlias: WhisperModelAlias): Promise<WhisperOperationResult> {
    return this.whisperPlugin.install(modelAlias);
  }

  uninstallWhisperPlugin(): Promise<WhisperOperationResult> {
    return this.whisperPlugin.uninstall();
  }
}
