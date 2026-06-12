// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP service for managing personal access tokens.
 * @param getTokenList - Loads all token metadata of the current user
 * @param createToken - Creates a new token and returns the plaintext token exactly once
 * @param revokeToken - Revokes (deletes) the token with the given id
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import {
  IPersonalAccessToken,
  IPersonalAccessTokenCreate,
  IPersonalAccessTokenCreated,
} from 'src/app/domain/models/settings/personal-access-token';
import { retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataPersonalAccessTokenService {
  private httpClient = inject(HttpClient);

  getTokenList() {
    return this.httpClient
      .get<IPersonalAccessToken[]>(`${environment.baseUrl}personal-access-tokens`)
      .pipe(retry(3));
  }

  createToken(value: IPersonalAccessTokenCreate) {
    return this.httpClient.post<IPersonalAccessTokenCreated>(
      `${environment.baseUrl}personal-access-tokens`,
      value
    );
  }

  revokeToken(id: string) {
    return this.httpClient
      .delete(`${environment.baseUrl}personal-access-tokens/` + id)
      .pipe(retry(3));
  }
}
