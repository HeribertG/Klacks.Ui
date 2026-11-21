// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * HTTP client for the admin endpoints of the local voice (status, licence text, install with licence consent). Uses
 * fetch like the Whisper plugin client, so a failing status poll neither toasts nor clears the unsaved-changes flag.
 * @param request - Install body: the explicit consent and the licence version the administrator read
 */
import { inject, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CredentialedFetchService } from 'src/app/domain/services/auth/credentialed-fetch.service';
import { LOCAL_TTS_ENDPOINTS } from 'src/app/domain/constants/local-tts.constants';
import { LocalTtsStatus } from 'src/app/domain/models/assistant/local-tts-status.interface';
import { LocalTtsLicense } from 'src/app/domain/models/assistant/local-tts-license.interface';
import { LocalTtsInstallRequest } from 'src/app/domain/models/assistant/local-tts-install-request.interface';
import { LocalTtsInstallResponse } from 'src/app/domain/models/assistant/local-tts-install-response.interface';

const JSON_CONTENT_TYPE = 'application/json';
const NETWORK_ERROR_STATUS = 0;

@Injectable({ providedIn: 'root' })
export class DataLocalTtsService {
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;
  private readonly credentialedFetch = inject(CredentialedFetchService);

  getStatus(): Promise<LocalTtsStatus | null> {
    return this.getJson<LocalTtsStatus>(LOCAL_TTS_ENDPOINTS.Status);
  }

  getLicense(): Promise<LocalTtsLicense | null> {
    return this.getJson<LocalTtsLicense>(LOCAL_TTS_ENDPOINTS.License);
  }

  async install(request: LocalTtsInstallRequest): Promise<LocalTtsInstallResponse> {
    try {
      const response = await this.credentialedFetch.fetch(`${this.baseUrl}${LOCAL_TTS_ENDPOINTS.Install}`, {
        method: 'POST',
        headers: { 'Content-Type': JSON_CONTENT_TYPE },
        body: JSON.stringify(request),
      });
      return { httpStatus: response.status, reason: await this.readReason(response) };
    } catch {
      return { httpStatus: NETWORK_ERROR_STATUS, reason: '' };
    }
  }

  private async getJson<T>(endpoint: string): Promise<T | null> {
    try {
      const response = await this.credentialedFetch.fetch(`${this.baseUrl}${endpoint}`, { method: 'GET' });
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  private async readReason(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { reason?: unknown };
      return typeof body?.reason === 'string' ? body.reason : '';
    } catch {
      return '';
    }
  }
}
