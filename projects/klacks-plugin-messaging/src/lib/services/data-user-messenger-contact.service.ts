// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the signed-in user's own messenger channels, backed by the plugin REST endpoint
 * /api/user-messenger-contacts. None of the calls carries a user id: the server derives the account
 * from the access token, so a channel or a pairing code for somebody else cannot be requested here.
 * @param httpClient - Angular HTTP client
 * @param apiUrl - Base API URL injected via PLUGIN_API_BASE_URL token
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { PLUGIN_API_BASE_URL } from 'klacks-plugin-contracts';
import {
  UserMessengerContact,
  UserMessengerPairingCode,
} from '../models/user-messenger-contact.model';

@Injectable({ providedIn: 'root' })
export class DataUserMessengerContactService {
  private httpClient = inject(HttpClient);
  private apiUrl = inject(PLUGIN_API_BASE_URL);

  getMyContacts(): Observable<UserMessengerContact[]> {
    return this.httpClient
      .get<UserMessengerContact[]>(`${this.apiUrl}user-messenger-contacts/mine`)
      .pipe(retry(3));
  }

  createPairingCode(): Observable<UserMessengerPairingCode> {
    return this.httpClient.post<UserMessengerPairingCode>(
      `${this.apiUrl}user-messenger-contacts/pairing-code`,
      {},
    );
  }

  deleteContact(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}user-messenger-contacts/${id}`);
  }
}
