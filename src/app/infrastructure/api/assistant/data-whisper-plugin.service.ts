// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the self-hosted Whisper STT plugin admin endpoints (status, install, uninstall).
 * @param modelAlias - The Whisper model alias to install ('small' or 'large-v3-turbo')
 */
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

const WHISPER_STATUS_ENDPOINT = 'stt/whisper-plugin/status';
const WHISPER_INSTALL_ENDPOINT = 'stt/whisper-plugin/install';
const WHISPER_UNINSTALL_ENDPOINT = 'stt/whisper-plugin/uninstall';
const JSON_CONTENT_TYPE = 'application/json';
const NETWORK_ERROR_REASON = 'Network error';

export const WhisperModelAliases = {
  Small: 'small',
  LargeV3Turbo: 'large-v3-turbo',
} as const;

export type WhisperModelAlias = (typeof WhisperModelAliases)[keyof typeof WhisperModelAliases];

export const WhisperOperationTypes = {
  Install: 'WhisperInstall',
  Uninstall: 'WhisperUninstall',
} as const;

export const WhisperOperationStatuses = {
  Pending: 'Pending',
  Running: 'Running',
  Succeeded: 'Succeeded',
  Failed: 'Failed',
} as const;

export interface WhisperOperationInfo {
  id: string;
  operationType: string;
  status: string;
  modelAlias: string | null;
  message: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface WhisperPluginStatus {
  installed: boolean;
  modelAlias: string | null;
  modelId: string | null;
  activeOperation: WhisperOperationInfo | null;
  lastOperation: WhisperOperationInfo | null;
  otherOperationActive: boolean;
}

export interface WhisperOperationResult {
  enqueued: boolean;
  operationId: string | null;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class DataWhisperPluginService {
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  async getStatus(): Promise<WhisperPluginStatus | null> {
    const token = localStorage.getItem(StorageKeys.TOKEN);

    try {
      const response = await fetch(`${this.baseUrl}${WHISPER_STATUS_ENDPOINT}`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) return null;
      return (await response.json()) as WhisperPluginStatus;
    } catch {
      return null;
    }
  }

  async install(modelAlias: WhisperModelAlias): Promise<WhisperOperationResult> {
    return this.postOperation(WHISPER_INSTALL_ENDPOINT, { modelAlias });
  }

  async uninstall(): Promise<WhisperOperationResult> {
    return this.postOperation(WHISPER_UNINSTALL_ENDPOINT, null);
  }

  private async postOperation(
    endpoint: string,
    body: { modelAlias: WhisperModelAlias } | null,
  ): Promise<WhisperOperationResult> {
    const token = localStorage.getItem(StorageKeys.TOKEN);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': JSON_CONTENT_TYPE,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      try {
        return (await response.json()) as WhisperOperationResult;
      } catch {
        return { enqueued: false, operationId: null, reason: `HTTP ${response.status}` };
      }
    } catch (err) {
      return {
        enqueued: false,
        operationId: null,
        reason: err instanceof Error ? err.message : NETWORK_ERROR_REASON,
      };
    }
  }
}
