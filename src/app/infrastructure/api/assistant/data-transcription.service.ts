// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for enhancing raw speech-to-text output via the backend transcription LLM endpoint.
 * @param rawText - The unprocessed speech-to-text output to be cleaned up
 * @param locale - The locale code for language-aware enhancement
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from 'src/environments/environment';

const TRANSCRIPTION_ENDPOINT = 'transcription/enhance';
const ENHANCE_TIMEOUT_MS = 15000;

interface IEnhanceResponse {
  enhancedText?: string;
}

@Injectable({ providedIn: 'root' })
export class DataTranscriptionService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  async enhance(rawText: string, locale: string, modelId?: string): Promise<string> {
    try {
      const result = await firstValueFrom(
        this.http
          .post<IEnhanceResponse>(`${this.baseUrl}${TRANSCRIPTION_ENDPOINT}`, { rawText, locale, modelId })
          .pipe(timeout(ENHANCE_TIMEOUT_MS))
      );
      return result.enhancedText || rawText;
    } catch {
      return rawText;
    }
  }
}
