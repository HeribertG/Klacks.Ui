// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for messaging operations (providers, messages, send).
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { PLUGIN_API_BASE_URL } from 'klacks-plugin-contracts';
import { MessagingProvider } from '../models/messaging-provider.model';
import { Message } from '../models/message.model';
import { CreateMessagingProvider } from '../models/create-messaging-provider.model';
import { SendMessage } from '../models/send-message.model';
import { MessageDirection } from '../enums/message-direction.enum';

@Injectable({ providedIn: 'root' })
export class DataMessagingService {
  private httpClient = inject(HttpClient);
  private apiUrl = inject(PLUGIN_API_BASE_URL);

  getProviders(): Observable<MessagingProvider[]> {
    return this.httpClient.get<MessagingProvider[]>(`${this.apiUrl}messaging/providers`).pipe(retry(3));
  }

  getProvider(id: string): Observable<MessagingProvider> {
    return this.httpClient.get<MessagingProvider>(`${this.apiUrl}messaging/providers/${id}`).pipe(retry(3));
  }

  createProvider(dto: CreateMessagingProvider): Observable<MessagingProvider> {
    return this.httpClient.post<MessagingProvider>(`${this.apiUrl}messaging/providers`, dto);
  }

  updateProvider(id: string, dto: CreateMessagingProvider): Observable<MessagingProvider> {
    return this.httpClient.put<MessagingProvider>(`${this.apiUrl}messaging/providers/${id}`, dto);
  }

  deleteProvider(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}messaging/providers/${id}`);
  }

  testProvider(id: string): Observable<{ success: boolean }> {
    return this.httpClient.post<{ success: boolean }>(`${this.apiUrl}messaging/providers/${id}/test`, {});
  }

  getMessages(providerId?: string, direction?: MessageDirection, sender?: string, count = 50, offset = 0): Observable<Message[]> {
    let params = new HttpParams()
      .set('count', count.toString())
      .set('offset', offset.toString());
    if (providerId) params = params.set('providerId', providerId);
    if (direction !== undefined) params = params.set('direction', direction.toString());
    if (sender) params = params.set('sender', sender);

    return this.httpClient.get<Message[]>(`${this.apiUrl}messaging/messages`, { params }).pipe(retry(3));
  }

  getMessage(id: string): Observable<Message> {
    return this.httpClient.get<Message>(`${this.apiUrl}messaging/messages/${id}`).pipe(retry(3));
  }

  sendMessage(dto: SendMessage): Observable<{ success: boolean; externalMessageId?: string; errorMessage?: string }> {
    return this.httpClient.post<{ success: boolean; externalMessageId?: string; errorMessage?: string }>(`${this.apiUrl}messaging/messages/send`, dto);
  }
}
