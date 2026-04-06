// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the owner messenger jsonb setting (APP_OWNER_MESSENGERS).
 * Reads and writes via the plugin REST endpoint /api/owner-messengers.
 * @param httpClient - Angular HTTP client
 * @param apiUrl - Base API URL injected via PLUGIN_API_BASE_URL token
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { PLUGIN_API_BASE_URL } from 'klacks-plugin-contracts';
import { OwnerMessengerEntry } from '../models/owner-messenger-entry.model';

@Injectable({ providedIn: 'root' })
export class DataOwnerMessengerService {
  private httpClient = inject(HttpClient);
  private apiUrl = inject(PLUGIN_API_BASE_URL);

  getOwnerMessengers(): Observable<OwnerMessengerEntry[]> {
    return this.httpClient
      .get<OwnerMessengerEntry[]>(`${this.apiUrl}owner-messengers`)
      .pipe(retry(3));
  }

  saveOwnerMessengers(entries: OwnerMessengerEntry[]): Observable<OwnerMessengerEntry[]> {
    return this.httpClient.put<OwnerMessengerEntry[]>(`${this.apiUrl}owner-messengers`, entries);
  }
}
