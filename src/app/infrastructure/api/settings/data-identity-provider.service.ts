// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IIdentityProvider } from 'src/app/domain/interfaces/identity-provider.interface';
import { IIdentityProviderListItem } from 'src/app/domain/interfaces/identity-provider-list-item.interface';
import { ITestConnectionResult } from 'src/app/domain/interfaces/test-connection-result.interface';
import { ISyncResult } from 'src/app/domain/interfaces/sync-result.interface';
import { ICreateIdentityProviderRequest } from 'src/app/domain/interfaces/create-identity-provider-request.interface';
import { IUpdateIdentityProviderRequest } from 'src/app/domain/interfaces/update-identity-provider-request.interface';
import { IDirectoryAccount } from 'src/app/domain/models/settings/directory-account.interface';
import { IDirectoryAccountList } from 'src/app/domain/models/settings/directory-account-list.interface';
import { IDirectoryAccountAccess } from 'src/app/domain/models/settings/directory-account-access.interface';
import {
  DIRECTORY_ACCOUNTS_ACCESS_API_SEGMENT,
  DIRECTORY_ACCOUNTS_API_SEGMENT,
  DIRECTORY_ACCOUNTS_SEARCH_PARAM,
} from 'src/app/domain/constants/identity-provider.constants';

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

  getDirectoryAccounts(id: string, search: string): Observable<IDirectoryAccountList> {
    const term = search.trim();
    const params = term ? new HttpParams().set(DIRECTORY_ACCOUNTS_SEARCH_PARAM, term) : undefined;
    return this.httpClient.get<IDirectoryAccountList>(
      `${this.apiUrl}/${id}/${DIRECTORY_ACCOUNTS_API_SEGMENT}`,
      { params }
    );
  }

  setDirectoryAccountAccess(id: string, externalId: string, mayLogin: boolean): Observable<IDirectoryAccount> {
    const body: IDirectoryAccountAccess = { externalId, mayLogin };
    return this.httpClient.put<IDirectoryAccount>(
      `${this.apiUrl}/${id}/${DIRECTORY_ACCOUNTS_API_SEGMENT}/${DIRECTORY_ACCOUNTS_ACCESS_API_SEGMENT}`,
      body
    );
  }
}
