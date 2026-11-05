// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * HTTP client for the account session calls. The access and refresh tokens live in HttpOnly cookies the browser sends
 * on the credentialed calls; a refresh token that an older build left in localStorage is migrated once.
 * @param request - Login credentials for LoginUser
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { LoginRequest } from './login-request.interface';
import { RefreshTokenRequest } from './refresh-token-request.interface';
import { MyToken } from 'src/app/domain/models/my-token-class';
import { SessionRenewalOutcome } from 'src/app/domain/enums/session-renewal-outcome.enum';
import { isRefreshTokenRejection } from 'src/app/domain/helpers/refresh-token-rejection.helper';
import { SessionStore } from '../storage/session-store.service';
import { credentialedRequestOptions } from '../helpers/credentialed-request.helper';
import { retryTransientHttpErrors } from '../helpers/http-retry.helper';
import { ACCOUNT_LOGOUT_PATH } from 'src/app/domain/constants/auth-request.constants';

const LOGOUT_RETRY_COUNT = 1;

@Injectable({
  providedIn: 'root',
})
export class DataAuthService {
  private httpClient = inject(HttpClient);
  private sessionStore = inject(SessionStore);

  private refreshInFlight$: Observable<MyToken> | null = null;

  login(request: LoginRequest): Observable<MyToken> {
    return this.httpClient.post<MyToken>(
      `${environment.baseUrl}Accounts/LoginUser`,
      request,
      credentialedRequestOptions()
    );
  }

  /**
   * Renews the session cookies. Single-flight: concurrent callers in this tab (HTTP 401 interceptor, SignalR, raw
   * fetch calls, startup) share one in-flight request. A success records the new access-token expiry. A refresh token
   * left in localStorage by an older build is sent once in the body; the key is dropped once the server answered it
   * (success, 400 or 401) and kept on a network or server error for the next attempt.
   */
  refreshToken(): Observable<MyToken> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const legacyRefreshToken = this.sessionStore.legacyRefreshToken();
    const body: Partial<RefreshTokenRequest> = legacyRefreshToken ? { refreshToken: legacyRefreshToken } : {};

    this.refreshInFlight$ = this.httpClient
      .post<MyToken>(`${environment.baseUrl}Accounts/RefreshToken`, body, credentialedRequestOptions())
      .pipe(
        tap({
          next: (token) => {
            this.sessionStore.forgetLegacyRefreshToken();
            if (token) {
              this.sessionStore.storeAccessExpiry(token.expTime);
            }
          },
          error: (error: unknown) => {
            if (isRefreshTokenRejection(error)) {
              this.sessionStore.forgetLegacyRefreshToken();
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
   * Renews the session for callers outside the HTTP interceptor chain (SignalR, raw fetch, WebSocket). Never throws:
   * Rejected means the server refused the refresh credential (400/401, the session is over), Unavailable a network,
   * 5xx or 429 failure that leaves the session alone. Without a local session nothing is sent.
   */
  async renewSession(): Promise<SessionRenewalOutcome> {
    if (!this.sessionStore.hasSession()) {
      return SessionRenewalOutcome.Rejected;
    }
    try {
      await firstValueFrom(this.refreshToken());
      return SessionRenewalOutcome.Renewed;
    } catch (error) {
      return isRefreshTokenRejection(error) ? SessionRenewalOutcome.Rejected : SessionRenewalOutcome.Unavailable;
    }
  }

  /**
   * Signs this device out on the server: revokes the refresh token in the cookie and clears both session cookies.
   * The endpoint is idempotent and allows anonymous calls, so a transient failure (network, 5xx, 408, 429) is repeated
   * once; any other answer is final. Callers must not block the client-side logout on the outcome.
   */
  logout(): Observable<void> {
    return this.httpClient
      .post<void>(`${environment.baseUrl}${ACCOUNT_LOGOUT_PATH}`, {}, credentialedRequestOptions())
      .pipe(retryTransientHttpErrors<void>(LOGOUT_RETRY_COUNT));
  }
}
