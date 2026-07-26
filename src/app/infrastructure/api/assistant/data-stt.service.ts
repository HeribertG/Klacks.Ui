// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for STT provider management endpoints (test connection, list providers).
 * @param providerId - The identifier of the STT provider to test or query
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

const STT_TEST_ENDPOINT = 'stt/test';
const STT_PROVIDERS_ENDPOINT = 'stt/providers';
const STT_CUSTOM_PROVIDERS_ENDPOINT = 'stt/providers/custom';
const STT_TRANSCRIBE_ENDPOINT = 'stt/transcribe';
const WAV_CONTENT_TYPE = 'audio/wav';

export interface SttTestResult {
  success: boolean;
  error?: string;
}

export interface SttProviderInfo {
  providerId: string;
}

export interface CustomSttProviderInfo {
  id: string;
  name: string;
  connectionType: string;
  apiUrl: string;
  languageModel: string | null;
  isEnabled: boolean;
  isSystem: boolean;
}

@Injectable({ providedIn: 'root' })
export class DataSttService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  async testConnection(providerId: string): Promise<SttTestResult> {
    try {
      return await firstValueFrom(
        this.http.post<SttTestResult>(`${this.baseUrl}${STT_TEST_ENDPOINT}`, { providerId })
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        return { success: false, error: `HTTP ${err.status}` };
      }
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  async transcribe(audio: Blob, locale: string): Promise<string> {
    const result = await firstValueFrom(
      this.http.post<{ text: string }>(
        `${this.baseUrl}${STT_TRANSCRIBE_ENDPOINT}?locale=${encodeURIComponent(locale)}`,
        audio,
        { headers: { 'Content-Type': WAV_CONTENT_TYPE } }
      )
    );
    return result.text ?? '';
  }

  async getProviders(): Promise<SttProviderInfo[]> {
    try {
      return await firstValueFrom(
        this.http.get<SttProviderInfo[]>(`${this.baseUrl}${STT_PROVIDERS_ENDPOINT}`)
      );
    } catch {
      return [];
    }
  }

  async getCustomProviders(): Promise<CustomSttProviderInfo[]> {
    try {
      return await firstValueFrom(
        this.http.get<CustomSttProviderInfo[]>(`${this.baseUrl}${STT_CUSTOM_PROVIDERS_ENDPOINT}`)
      );
    } catch {
      return [];
    }
  }
}
