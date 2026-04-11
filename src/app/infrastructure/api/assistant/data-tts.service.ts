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

export interface TtsSynthesizeRequest {
  text: string;
  locale: string;
  providerId?: string;
  voiceId?: string;
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
}
