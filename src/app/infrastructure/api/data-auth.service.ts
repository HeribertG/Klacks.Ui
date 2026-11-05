// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * HTTP client for the account session calls. The refresh credential lives in an HttpOnly cookie the browser sends on
 * the credentialed calls; a refresh token that an older build left in localStorage is migrated once.
 * @param request - Login credentials for LoginUser
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { LoginRequest } from './login-request.interface';
import { RefreshTokenRequest } from './refresh-token-request.interface';
import { MyToken } from 'src/app/domain/models/my-token-class';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { isRefreshTokenRejection } from 'src/app/domain/helpers/refresh-token-rejection.helper';
import { LocalStorageService } from '../storage/local-storage.service';
import { credentialedRequestOptions } from '../helpers/credentialed-request.helper';

@Injectable({
  providedIn: 'root',
})
export class DataAuthService {
  private httpClient = inject(HttpClient);
  private localStorageService = inject(LocalStorageService);

  private refreshInFlight$: Observable<MyToken> | null = null;

  login(request: LoginRequest): Observable<MyToken> {
    return this.httpClient.post<MyToken>(
      `${environment.baseUrl}Accounts/LoginUser`,
      request,
      credentialedRequestOptions()
    );
  }

  /**
   * Renews the access token through the refresh-token cookie. Single-flight: concurrent callers in this tab (HTTP 401
   * interceptor, SignalR token helper, startup) share one in-flight request. A refresh token left in localStorage by
   * an older build is sent once in the body; the key is dropped once the server answered it (success, 400 or 401) and
   * kept on a network or server error for the next attempt.
   */
  refreshToken(): Observable<MyToken> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const legacyRefreshToken = this.localStorageService.get(StorageKeys.TOKEN_REFRESHTOKEN);
    const body: Partial<RefreshTokenRequest> = legacyRefreshToken ? { refreshToken: legacyRefreshToken } : {};

    this.refreshInFlight$ = this.httpClient
      .post<MyToken>(`${environment.baseUrl}Accounts/RefreshToken`, body, credentialedRequestOptions())
      .pipe(
        tap({
          next: () => this.forgetLegacyRefreshToken(),
          error: (error: unknown) => {
            if (isRefreshTokenRejection(error)) {
              this.forgetLegacyRefreshToken();
            }
          },
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.refreshInFlight$;
  }

  /**
   * Signs this device out on the server: revokes the refresh token in the cookie and clears the cookie. Callers must
   * not block the client-side logout on the outcome.
   */
  logout(): Observable<void> {
    return this.httpClient.post<void>(
      `${environment.baseUrl}Accounts/Logout`,
      {},
      credentialedRequestOptions()
    );
  }

  private forgetLegacyRefreshToken(): void {
    this.localStorageService.remove(StorageKeys.TOKEN_REFRESHTOKEN);
  }
}
