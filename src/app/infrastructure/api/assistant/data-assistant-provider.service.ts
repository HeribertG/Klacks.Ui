// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * API service for managing LLM providers and models, including keyless local providers.
 * @param requiresApiKey - Whether a provider needs an API key (false for local servers such as Ollama)
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IAssistantProvider } from '../../../domain/models/assistant/assistant-provider.interface';
import { ICreateProviderRequest } from '../../../domain/models/assistant/create-provider-request.interface';
import { IUpdateProviderRequest } from '../../../domain/models/assistant/update-provider-request.interface';
import { IDiscoveredProvider } from 'src/app/domain/models/assistant/discovered-provider';

@Injectable({
  providedIn: 'root'
})
export class DataAssistantProviderService {
  private httpClient = inject(HttpClient);
  private readonly apiUrl = `${environment.baseAssistantUrl}providers`;

  getProviders(): Observable<IAssistantProvider[]> {
    return this.httpClient
      .get<IAssistantProvider[]>(this.apiUrl)
      .pipe(retry(3));
  }

  getProvider(id: string): Observable<IAssistantProvider> {
    return this.httpClient
      .get<IAssistantProvider>(`${this.apiUrl}/${id}`)
      .pipe(retry(3));
  }

  createProvider(request: ICreateProviderRequest): Observable<IAssistantProvider> {
    return this.httpClient
      .post<IAssistantProvider>(this.apiUrl, request)
      .pipe(retry(3));
  }

  updateProvider(id: string, request: IUpdateProviderRequest): Observable<IAssistantProvider> {
    return this.httpClient
      .put<IAssistantProvider>(`${this.apiUrl}/${id}`, request)
      .pipe(retry(3));
  }

  deleteProvider(id: string): Observable<void> {
    return this.httpClient
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(retry(3));
  }

  discoverProviders(): Observable<IDiscoveredProvider[]> {
    return this.httpClient.post<IDiscoveredProvider[]>(`${this.apiUrl}/discover`, {});
  }
}
