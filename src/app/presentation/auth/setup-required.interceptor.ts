// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Forces a hard redirect to the setup page whenever the backend blocks the seeded admin
 * account with SETUP_REQUIRED (403), so no open tab or in-flight action can be used to work
 * around the forced own-admin setup on a freshly deployed instance. Registered as the last
 * HTTP_INTERCEPTORS entry so it is the innermost interceptor and therefore sees the error
 * first - before ResponseInterceptor would otherwise show a misleading "access denied" toast
 * for whatever endpoint happened to be blocked. Completing with EMPTY instead of rethrowing is
 * deliberate: the user is redirected away regardless, so propagating the error would only
 * produce noise for components that are about to be destroyed (same reasoning as
 * TokenRefreshInterceptor's auth-failure path).
 */
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, throwError } from 'rxjs';
import { isSetupRequiredError } from 'src/app/domain/models/setup/setup-required.model';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

@Injectable()
export class SetupRequiredInterceptor implements HttpInterceptor {
  private navigationService = inject(NavigationService);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (isSetupRequiredError(error) && !this.navigationService.isOnSetupPage()) {
          this.navigationService.navigateToSetup();
          return EMPTY;
        }
        return throwError(() => error);
      })
    );
  }
}
