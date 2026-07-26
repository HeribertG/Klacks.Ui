// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for transcription dictionary CRUD operations.
 * @param baseUrl - Base URL for the assistant API endpoints
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

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
  private http = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  async getAll(): Promise<DictionaryEntry[]> {
    try {
      return await firstValueFrom(
        this.http.get<DictionaryEntry[]>(`${this.baseUrl}${DICTIONARY_ENDPOINT}`)
      );
    } catch {
      return [];
    }
  }

  async create(
    entry: Omit<DictionaryEntry, 'id'>,
  ): Promise<DictionaryEntry | null> {
    try {
      return await firstValueFrom(
        this.http.post<DictionaryEntry>(`${this.baseUrl}${DICTIONARY_ENDPOINT}`, entry)
      );
    } catch {
      return null;
    }
  }

  async update(entry: DictionaryEntry): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.put<void>(`${this.baseUrl}${DICTIONARY_ENDPOINT}/${entry.id}`, entry)
      );
      return true;
    } catch {
      return false;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.baseUrl}${DICTIONARY_ENDPOINT}/${id}`)
      );
      return true;
    } catch {
      return false;
    }
  }
}
