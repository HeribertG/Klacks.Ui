import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface IAssistantProvider {
  id: string;
  providerId: string;
  providerName: string;
  isEnabled: boolean;
  hasApiKey?: boolean;
  apiKey?: string;
  baseUrl?: string;
  apiVersion?: string;
  priority: number;
}

export interface ICreateProviderRequest {
  providerId: string;
  providerName: string;
  apiKey?: string;
  baseUrl?: string;
  apiVersion?: string;
  isEnabled: boolean;
  priority: number;
}

export interface IUpdateProviderRequest {
  providerName?: string;
  apiKey?: string;
  baseUrl?: string;
  apiVersion?: string;
  isEnabled: boolean;
  priority: number;
}

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
}
