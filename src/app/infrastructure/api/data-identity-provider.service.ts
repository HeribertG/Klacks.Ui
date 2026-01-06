import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IIdentityProvider,
  IIdentityProviderListItem,
  ITestConnectionResult,
  ISyncResult
} from 'src/app/domain/models/identity-provider-class';

export interface ICreateIdentityProviderRequest {
  name: string;
  type: number;
  isEnabled: boolean;
  sortOrder: number;
  useForAuthentication: boolean;
  useForClientImport: boolean;
  host?: string;
  port?: number;
  useSsl: boolean;
  baseDn?: string;
  bindDn?: string;
  bindPassword?: string;
  userFilter?: string;
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string;
  tenantId?: string;
  attributeMapping?: Record<string, string>;
}

export interface IUpdateIdentityProviderRequest {
  name: string;
  type: number;
  isEnabled: boolean;
  sortOrder: number;
  useForAuthentication: boolean;
  useForClientImport: boolean;
  host?: string;
  port?: number;
  useSsl: boolean;
  baseDn?: string;
  bindDn?: string;
  bindPassword?: string;
  userFilter?: string;
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string;
  tenantId?: string;
  attributeMapping?: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class DataIdentityProviderService {
  private httpClient = inject(HttpClient);
  private readonly apiUrl = `${environment.baseUrl}IdentityProviders`;

  getProviders(): Observable<IIdentityProviderListItem[]> {
    return this.httpClient
      .get<IIdentityProviderListItem[]>(this.apiUrl)
      .pipe(retry(3));
  }

  getProvider(id: string): Observable<IIdentityProvider> {
    return this.httpClient
      .get<IIdentityProvider>(`${this.apiUrl}/${id}`)
      .pipe(retry(3));
  }

  createProvider(request: ICreateIdentityProviderRequest): Observable<IIdentityProvider> {
    return this.httpClient
      .post<IIdentityProvider>(this.apiUrl, request)
      .pipe(retry(3));
  }

  updateProvider(id: string, request: IUpdateIdentityProviderRequest): Observable<IIdentityProvider> {
    return this.httpClient
      .put<IIdentityProvider>(`${this.apiUrl}/${id}`, request)
      .pipe(retry(3));
  }

  deleteProvider(id: string): Observable<void> {
    return this.httpClient
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(retry(3));
  }

  testConnection(id: string): Observable<ITestConnectionResult> {
    return this.httpClient
      .post<ITestConnectionResult>(`${this.apiUrl}/${id}/TestConnection`, {})
      .pipe(retry(1));
  }

  syncClients(id: string): Observable<ISyncResult> {
    return this.httpClient
      .post<ISyncResult>(`${this.apiUrl}/${id}/SyncClients`, {})
      .pipe(retry(1));
  }
}
