// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { MyToken } from 'src/app/domain/models/authentification-class';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataAuthService {
  private httpClient = inject(HttpClient);

  private refreshInFlight$: Observable<MyToken> | null = null;

  login(request: LoginRequest): Observable<MyToken> {
    return this.httpClient.post<MyToken>(
      `${environment.baseUrl}Accounts/LoginUser`,
      request
    );
  }

  /**
   * Single-flight refresh: concurrent callers (HTTP 401 interceptor, SignalR
   * token helper, proactive timers) share one in-flight request so the backend
   * rotates the single-use refresh token exactly once. Without this, the second
   * concurrent caller presents an already-rotated token and gets a 401.
   */
  refreshToken(request: RefreshTokenRequest): Observable<MyToken> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.httpClient
      .post<MyToken>(`${environment.baseUrl}Accounts/RefreshToken`, request)
      .pipe(
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.refreshInFlight$;
  }

  /**
   * Invalidates all server-side refresh tokens of the current user. Requires a
   * still-valid access token (Authorization header set by the auth interceptor);
   * callers must not block client-side logout on the outcome of this call.
   */
  logout(): Observable<void> {
    return this.httpClient.post<void>(`${environment.baseUrl}Accounts/Logout`, {});
  }
}
