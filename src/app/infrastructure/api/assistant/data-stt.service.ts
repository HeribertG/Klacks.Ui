// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for STT provider management endpoints (test connection, list providers).
 * @param providerId - The identifier of the STT provider to test or query
 */
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

const STT_TEST_ENDPOINT = 'stt/test';
const STT_PROVIDERS_ENDPOINT = 'stt/providers';
const STT_TRANSCRIBE_ENDPOINT = 'stt/transcribe';
const WAV_CONTENT_TYPE = 'audio/wav';

export interface SttTestResult {
  success: boolean;
  error?: string;
}

export interface SttProviderInfo {
  providerId: string;
}

@Injectable({ providedIn: 'root' })
export class DataSttService {
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  async testConnection(providerId: string): Promise<SttTestResult> {
    const token = localStorage.getItem(StorageKeys.TOKEN);

    try {
      const response = await fetch(`${this.baseUrl}${STT_TEST_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ providerId }),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      return (await response.json()) as SttTestResult;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  async transcribe(audio: Blob, locale: string): Promise<string> {
    const token = localStorage.getItem(StorageKeys.TOKEN);

    const response = await fetch(
      `${this.baseUrl}${STT_TRANSCRIBE_ENDPOINT}?locale=${encodeURIComponent(locale)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': WAV_CONTENT_TYPE,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: audio,
      },
    );

    if (!response.ok) {
      throw new Error(`Transcription failed: HTTP ${response.status}`);
    }

    const result = (await response.json()) as { text: string };
    return result.text ?? '';
  }

  async getProviders(): Promise<SttProviderInfo[]> {
    const token = localStorage.getItem(StorageKeys.TOKEN);

    try {
      const response = await fetch(`${this.baseUrl}${STT_PROVIDERS_ENDPOINT}`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) return [];
      return (await response.json()) as SttProviderInfo[];
    } catch {
      return [];
    }
  }
}
