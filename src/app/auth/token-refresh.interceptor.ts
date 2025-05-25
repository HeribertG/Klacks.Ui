/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { LocalStorageService } from '../services/local-storage.service';
import { MessageLibrary } from '../helpers/string-constants';

@Injectable()
export class TokenRefreshInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private localStorageService = inject(LocalStorageService);

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && this.shouldRefreshToken(req)) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return from(this.authService.refreshToken()).pipe(
        switchMap((success: boolean) => {
          this.isRefreshing = false;
          if (success) {
            this.refreshTokenSubject.next('refreshed');
            const newAuthReq = this.addAuthHeader(req);
            return next.handle(newAuthReq);
          } else {
            this.authService.logOut();
            return throwError(() => new HttpErrorResponse({ status: 401 }));
          }
        }),
        catchError((refreshError) => {
          this.isRefreshing = false;
          this.authService.logOut();
          return throwError(() => refreshError);
        })
      );
    } else {
      // Refresh in progress - wait for it
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap(() => {
          const newAuthReq = this.addAuthHeader(req);
          return next.handle(newAuthReq);
        })
      );
    }
  }

  private shouldRefreshToken(req: HttpRequest<any>): boolean {
    return (
      !req.url.includes('LoginUser') &&
      !req.url.includes('RefreshToken') &&
      req.headers.has('Authorization')
    );
  }

  private addAuthHeader(req: HttpRequest<any>): HttpRequest<any> {
    const token = this.localStorageService.get(MessageLibrary.TOKEN);
    if (token) {
      return req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`),
      });
    }
    return req;
  }
}
