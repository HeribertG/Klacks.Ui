// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpStatusCode,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, EMPTY } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { TOKEN_REFRESH_RETRIED } from 'src/app/domain/constants/http-context.constants';
import { NavigationService } from '../services/navigation.service';
import { DraftRecoveryService } from '../services/draft-recovery.service';
import { isInternalApiUrl } from 'src/app/domain/helpers/internal-api-url.helper';
import { environment } from 'src/environments/environment';

const REFRESH_SUCCEEDED = 'succeeded';
const REFRESH_FAILED = 'failed';
const REFRESH_UNAVAILABLE = 'unavailable';
const SESSION_ENDPOINTS: readonly string[] = ['LoginUser', 'RefreshToken', 'Logout', 'OAuth2/callback'];

/**
 * Renews the session cookies on a 401 of a request to the own API (isInternalApiUrl, the same rule AuthInterceptor
 * uses) and replays the failed request once. The access token is an HttpOnly cookie, so the replay is a plain clone:
 * the browser sends the renewed cookie, and the credentials and CSRF header that AuthInterceptor (which runs before
 * this interceptor) set stay on the request.
 * Serialises concurrent 401s so only one refresh runs: the first request performs the refresh, all others wait for
 * its outcome. A 401 of a request that was sent before the last successful refresh finished is replayed without a
 * second refresh. When the server rejects the refresh (400/401) the waiters are released (so their observables
 * complete and the loading spinner is not leaked) and the user is logged out; completing without an error is
 * deliberate: the user is redirected to the login page anyway. When the refresh fails transiently (network, 5xx,
 * 429) the session stays: the original requests fail with their 401 and the next request tries again. A per-request
 * retry flag (`TOKEN_REFRESH_RETRIED`) prevents infinite refresh loops. Only requests of a tab with a local session
 * are refreshed, so a leftover cookie never revives a signed-out tab.
 */
@Injectable()
export class TokenRefreshInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private navigationService = inject(NavigationService);
  private draftRecoveryService = inject(DraftRecoveryService);

  private isRefreshing = false;
  private lastRefreshSucceededAt = 0;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const sentAt = Date.now();
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (
          error.status === HttpStatusCode.Unauthorized &&
          this.shouldRefreshToken(req) &&
          !req.context.get(TOKEN_REFRESH_RETRIED)
        ) {
          return this.handle401Error(req, next, error, sentAt);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(
    req: HttpRequest<unknown>,
    next: HttpHandler,
    unauthorized: HttpErrorResponse,
    sentAt: number
  ): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing && this.lastRefreshSucceededAt > sentAt) {
      return next.handle(this.markRetried(req));
    }

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return from(this.authService.refreshToken()).pipe(
        switchMap((success: boolean) => {
          this.isRefreshing = false;
          if (success) {
            this.lastRefreshSucceededAt = Date.now();
            this.refreshTokenSubject.next(REFRESH_SUCCEEDED);
            return next.handle(this.markRetried(req));
          }
          this.refreshTokenSubject.next(REFRESH_FAILED);
          this.handleAuthFailure();
          return EMPTY;
        }),
        catchError(() => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(REFRESH_UNAVAILABLE);
          return throwError(() => unauthorized);
        })
      );
    }

    return this.refreshTokenSubject.pipe(
      filter((status) => status !== null),
      take(1),
      switchMap((status) => {
        if (status === REFRESH_FAILED) {
          return EMPTY;
        }
        if (status === REFRESH_UNAVAILABLE) {
          return throwError(() => unauthorized);
        }
        return next.handle(this.markRetried(req));
      })
    );
  }

  private handleAuthFailure(): void {
    this.draftRecoveryService.capture();
    this.authService.logOut();
    this.navigationService.redirectToLogin();
  }

  private shouldRefreshToken(req: HttpRequest<unknown>): boolean {
    return (
      isInternalApiUrl(req.url, environment.baseUrl) &&
      !SESSION_ENDPOINTS.some((endpoint) => req.url.includes(endpoint)) &&
      this.authService.authenticated()
    );
  }

  private markRetried(req: HttpRequest<unknown>): HttpRequest<unknown> {
    return req.clone({ context: req.context.set(TOKEN_REFRESH_RETRIED, true) });
  }
}
