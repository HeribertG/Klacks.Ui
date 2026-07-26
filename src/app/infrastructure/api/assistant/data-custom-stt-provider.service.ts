// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for custom STT provider CRUD operations.
 * @param baseUrl - Base URL for the assistant API endpoints
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

const CUSTOM_STT_ENDPOINT = 'stt/providers/custom';

export interface CustomSttProvider {
  id: string;
  name: string;
  connectionType: string;
  apiUrl: string;
  apiKey: string | null;
  languageModel: string | null;
  isEnabled: boolean;
  isSystem: boolean;
}

@Injectable({ providedIn: 'root' })
export class DataCustomSttProviderService {
  private http = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  async getAll(): Promise<CustomSttProvider[]> {
    try {
      return await firstValueFrom(
        this.http.get<CustomSttProvider[]>(`${this.baseUrl}${CUSTOM_STT_ENDPOINT}`)
      );
    } catch {
      return [];
    }
  }

  async create(
    provider: Omit<CustomSttProvider, 'id' | 'isSystem'>,
  ): Promise<CustomSttProvider | null> {
    try {
      return await firstValueFrom(
        this.http.post<CustomSttProvider>(`${this.baseUrl}${CUSTOM_STT_ENDPOINT}`, provider)
      );
    } catch {
      return null;
    }
  }

  async update(provider: CustomSttProvider): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.put<void>(`${this.baseUrl}${CUSTOM_STT_ENDPOINT}/${provider.id}`, provider)
      );
      return true;
    } catch {
      return false;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.baseUrl}${CUSTOM_STT_ENDPOINT}/${id}`)
      );
      return true;
    } catch {
      return false;
    }
  }
}
