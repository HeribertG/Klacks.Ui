// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for custom STT provider CRUD operations.
 * @param baseUrl - Base URL for the assistant API endpoints
 */
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

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
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  private getHeaders(): Record<string, string> {
    const token = localStorage.getItem(StorageKeys.TOKEN);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getAll(): Promise<CustomSttProvider[]> {
    try {
      const response = await fetch(`${this.baseUrl}${CUSTOM_STT_ENDPOINT}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!response.ok) return [];
      return (await response.json()) as CustomSttProvider[];
    } catch {
      return [];
    }
  }

  async create(
    provider: Omit<CustomSttProvider, 'id' | 'isSystem'>,
  ): Promise<CustomSttProvider | null> {
    try {
      const response = await fetch(`${this.baseUrl}${CUSTOM_STT_ENDPOINT}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(provider),
      });
      if (!response.ok) return null;
      return (await response.json()) as CustomSttProvider;
    } catch {
      return null;
    }
  }

  async update(provider: CustomSttProvider): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}${CUSTOM_STT_ENDPOINT}/${provider.id}`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(provider),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}${CUSTOM_STT_ENDPOINT}/${id}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
