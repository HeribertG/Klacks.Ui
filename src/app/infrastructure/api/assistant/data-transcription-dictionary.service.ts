// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for transcription dictionary CRUD operations.
 * @param baseUrl - Base URL for the assistant API endpoints
 */
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

const DICTIONARY_ENDPOINT = 'transcription/dictionary';

export interface DictionaryEntry {
  id: string;
  correctTerm: string;
  category: string | null;
  phoneticVariants: string[];
  description: string | null;
  language: string | null;
}

@Injectable({ providedIn: 'root' })
export class DataTranscriptionDictionaryService {
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  private getHeaders(): Record<string, string> {
    const token = localStorage.getItem(StorageKeys.TOKEN);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getAll(): Promise<DictionaryEntry[]> {
    try {
      const response = await fetch(`${this.baseUrl}${DICTIONARY_ENDPOINT}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!response.ok) return [];
      return (await response.json()) as DictionaryEntry[];
    } catch {
      return [];
    }
  }

  async create(
    entry: Omit<DictionaryEntry, 'id'>,
  ): Promise<DictionaryEntry | null> {
    try {
      const response = await fetch(`${this.baseUrl}${DICTIONARY_ENDPOINT}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(entry),
      });
      if (!response.ok) return null;
      return (await response.json()) as DictionaryEntry;
    } catch {
      return null;
    }
  }

  async update(entry: DictionaryEntry): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}${DICTIONARY_ENDPOINT}/${entry.id}`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(entry),
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
        `${this.baseUrl}${DICTIONARY_ENDPOINT}/${id}`,
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
