// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for per-client MessengerContact CRUD via the plugin REST endpoint.
 * @param httpClient - Angular HTTP client
 * @param apiUrl - Base API URL injected via PLUGIN_API_BASE_URL token
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { PLUGIN_API_BASE_URL } from 'klacks-plugin-contracts';
import {
  MessengerContact,
  CreateMessengerContact,
} from '../models/messenger-contact.model';

@Injectable({ providedIn: 'root' })
export class DataMessengerContactService {
  private httpClient = inject(HttpClient);
  private apiUrl = inject(PLUGIN_API_BASE_URL);

  getByClient(clientId: string): Observable<MessengerContact[]> {
    return this.httpClient
      .get<MessengerContact[]>(`${this.apiUrl}messenger-contacts/by-client/${clientId}`)
      .pipe(retry(3));
  }

  create(dto: CreateMessengerContact): Observable<MessengerContact> {
    return this.httpClient.post<MessengerContact>(`${this.apiUrl}messenger-contacts`, dto);
  }

  update(id: string, dto: CreateMessengerContact): Observable<MessengerContact> {
    return this.httpClient.put<MessengerContact>(`${this.apiUrl}messenger-contacts/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}messenger-contacts/${id}`);
  }
}
