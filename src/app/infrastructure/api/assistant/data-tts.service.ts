// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the TTS synthesis endpoint.
 * Returns raw audio Blobs without managing playback state.
 * @param request - Contains the text to synthesize, locale, and optional provider/voice IDs
 */
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

const TTS_SYNTHESIZE_ENDPOINT = 'tts/synthesize';
const TTS_VOICES_ENDPOINT = 'tts/voices';
const TTS_TEST_ENDPOINT = 'tts/test';

export interface TtsSynthesizeRequest {
  text: string;
  locale: string;
  providerId?: string;
  voiceId?: string;
}

export interface TtsVoiceDto {
  voiceId: string;
  locale: string;
  displayName: string;
}

export interface TtsTestResult {
  success: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class DataTtsService {
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  async synthesize(request: TtsSynthesizeRequest): Promise<Blob | null> {
    try {
      const token = localStorage.getItem(StorageKeys.TOKEN);

      const response = await fetch(`${this.baseUrl}${TTS_SYNTHESIZE_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) return null;
      return await response.blob();
    } catch {
      return null;
    }
  }

  async testConnection(providerId: string): Promise<TtsTestResult> {
    const token = localStorage.getItem(StorageKeys.TOKEN);

    try {
      const response = await fetch(`${this.baseUrl}${TTS_TEST_ENDPOINT}`, {
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

      return (await response.json()) as TtsTestResult;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  async getVoices(providerId?: string): Promise<TtsVoiceDto[]> {
    try {
      const token = localStorage.getItem(StorageKeys.TOKEN);
      const url = providerId
        ? `${this.baseUrl}${TTS_VOICES_ENDPOINT}?providerId=${providerId}`
        : `${this.baseUrl}${TTS_VOICES_ENDPOINT}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) return [];
      return (await response.json()) as TtsVoiceDto[];
    } catch {
      return [];
    }
  }
}
