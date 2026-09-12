// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Guard that protects routes requiring a session. It answers one question only - is the user
 * signed in - and sends anyone else to the login page with the requested url. Which rights a
 * route demands is the business of permissionGuard, which reads them from the route data.
 * Losing the session is not a rights problem, so no refusal reason is recorded here.
 */
import { inject } from '@angular/core';
import { CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

export const AuthGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const navigationService = inject(NavigationService);

  if (authService.authenticated()) {
    return true;
  }

  navigationService.redirectToLogin(state.url);
  return false;
};
