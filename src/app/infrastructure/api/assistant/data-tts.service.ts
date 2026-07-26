// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the TTS synthesis endpoint.
 * Returns raw audio Blobs without managing playback state.
 * @param request - Contains the text to synthesize, locale, and optional provider/voice IDs
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

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
  private http = inject(HttpClient);
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  async synthesize(request: TtsSynthesizeRequest): Promise<Blob | null> {
    try {
      return await firstValueFrom(
        this.http.post(`${this.baseUrl}${TTS_SYNTHESIZE_ENDPOINT}`, request, {
          responseType: 'blob',
        })
      );
    } catch {
      return null;
    }
  }

  async testConnection(providerId: string): Promise<TtsTestResult> {
    try {
      return await firstValueFrom(
        this.http.post<TtsTestResult>(`${this.baseUrl}${TTS_TEST_ENDPOINT}`, { providerId })
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        return { success: false, error: `HTTP ${err.status}` };
      }
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  async getVoices(providerId?: string): Promise<TtsVoiceDto[]> {
    try {
      const url = providerId
        ? `${this.baseUrl}${TTS_VOICES_ENDPOINT}?providerId=${providerId}`
        : `${this.baseUrl}${TTS_VOICES_ENDPOINT}`;

      return await firstValueFrom(this.http.get<TtsVoiceDto[]>(url));
    } catch {
      return [];
    }
  }
}
