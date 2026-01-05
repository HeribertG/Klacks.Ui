import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ILLMProvider {
  id: string;
  providerId: string;
  providerName: string;
  isEnabled: boolean;
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
export class DataLLMProviderService {
  private httpClient = inject(HttpClient);
  private readonly apiUrl = `${environment.baseAssistantUrl}providers`;

  getProviders(): Observable<ILLMProvider[]> {
    return this.httpClient
      .get<ILLMProvider[]>(this.apiUrl)
      .pipe(retry(3));
  }

  getProvider(id: string): Observable<ILLMProvider> {
    return this.httpClient
      .get<ILLMProvider>(`${this.apiUrl}/${id}`)
      .pipe(retry(3));
  }

  createProvider(request: ICreateProviderRequest): Observable<ILLMProvider> {
    return this.httpClient
      .post<ILLMProvider>(this.apiUrl, request)
      .pipe(retry(3));
  }

  updateProvider(id: string, request: IUpdateProviderRequest): Observable<ILLMProvider> {
    return this.httpClient
      .put<ILLMProvider>(`${this.apiUrl}/${id}`, request)
      .pipe(retry(3));
  }

  deleteProvider(id: string): Observable<void> {
    return this.httpClient
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(retry(3));
  }
}