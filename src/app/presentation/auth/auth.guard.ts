// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Guard that protects routes requiring authentication and authorization.
 */
import { inject } from '@angular/core';
import { CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

export const AuthGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const navigationService = inject(NavigationService);

  if (authService.authenticated() && authService.isAuthorised(state.url)) {
    return true;
  }

  navigationService.redirectToLogin(state.url);
  return false;
};
