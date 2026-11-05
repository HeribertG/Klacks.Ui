// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, EMPTY } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { TOKEN_REFRESH_RETRIED } from 'src/app/domain/constants/http-context.constants';
import { NavigationService } from '../services/navigation.service';
import { DraftRecoveryService } from '../services/draft-recovery.service';

const REFRESH_SUCCEEDED = 'succeeded';
const REFRESH_FAILED = 'failed';
const REFRESH_UNAVAILABLE = 'unavailable';

/**
 * Refreshes an expired access token on a 401 and replays the failed request.
 * Serialises concurrent 401s so only one refresh runs: the first request
 * performs the refresh, all others wait for its outcome. On success the waiters
 * replay with the new token. When the server rejects the refresh (400/401) they
 * are released (so their observables complete and the loading spinner is not
 * leaked) and the user is logged out; completing without an error is deliberate
 * and covered by tests: the user is redirected to the login page anyway, so error
 * handlers would only produce noise for components that are about to be destroyed.
 * When the refresh fails transiently (network, 5xx, 429) the session stays: the
 * original requests fail with their 401 and the next request tries again.
 * A per-request retry flag (`TOKEN_REFRESH_RETRIED`) prevents infinite refresh
 * loops, and a token-comparison shortcut replays a request with the token another
 * caller already renewed instead of refreshing a second time.
 */
@Injectable()
export class TokenRefreshInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private localStorageService = inject(LocalStorageService);
  private navigationService = inject(NavigationService);
  private draftRecoveryService = inject(DraftRecoveryService);

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (
          error.status === 401 &&
          this.shouldRefreshToken(req) &&
          !req.context.get(TOKEN_REFRESH_RETRIED)
        ) {
          return this.handle401Error(req, next, error);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(
    req: HttpRequest<unknown>,
    next: HttpHandler,
    unauthorized: HttpErrorResponse
  ): Observable<HttpEvent<unknown>> {
    const requestToken = this.extractBearerToken(req);
    const currentToken = this.localStorageService.get(StorageKeys.TOKEN);

    if (
      !this.isRefreshing &&
      currentToken &&
      requestToken &&
      currentToken !== requestToken
    ) {
      return next.handle(this.addAuthHeader(req));
    }

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return from(this.authService.refreshToken()).pipe(
        switchMap((success: boolean) => {
          this.isRefreshing = false;
          if (success) {
            this.refreshTokenSubject.next(REFRESH_SUCCEEDED);
            return next.handle(this.addAuthHeader(req));
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
        return next.handle(this.addAuthHeader(req));
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
      !req.url.includes('LoginUser') &&
      !req.url.includes('RefreshToken') &&
      !req.url.includes('Logout') &&
      req.headers.has('Authorization')
    );
  }

  private extractBearerToken(req: HttpRequest<unknown>): string | null {
    const header = req.headers.get('Authorization');
    if (header && header.startsWith('Bearer ')) {
      return header.substring('Bearer '.length);
    }
    return null;
  }

  private addAuthHeader(req: HttpRequest<unknown>): HttpRequest<unknown> {
    const token = this.localStorageService.get(StorageKeys.TOKEN);
    const context = req.context.set(TOKEN_REFRESH_RETRIED, true);
    if (token) {
      return req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`),
        context,
      });
    }
    return req.clone({ context });
  }
}
