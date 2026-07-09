// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for enhancing raw speech-to-text output via the backend transcription LLM endpoint.
 * @param rawText - The unprocessed speech-to-text output to be cleaned up
 * @param locale - The locale code for language-aware enhancement
 */
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

const TRANSCRIPTION_ENDPOINT = 'transcription/enhance';
const ENHANCE_TIMEOUT_MS = 15000;

@Injectable({ providedIn: 'root' })
export class DataTranscriptionService {
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  async enhance(rawText: string, locale: string, modelId?: string): Promise<string> {
    try {
      const token = localStorage.getItem(StorageKeys.TOKEN);

      const response = await fetch(`${this.baseUrl}${TRANSCRIPTION_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rawText, locale, modelId }),
        signal: AbortSignal.timeout(ENHANCE_TIMEOUT_MS),
      });

      if (!response.ok) {
        return rawText;
      }

      const result = await response.json();
      return result.enhancedText || rawText;
    } catch {
      return rawText;
    }
  }
}
