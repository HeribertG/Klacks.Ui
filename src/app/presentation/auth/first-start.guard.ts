// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards of the anonymous first start. firstStartLoginGuard sits on the login route: on a fresh installation that
 * still waits for its own admin account it sends a visitor without a session to the setup page before the login form
 * is shown. firstStartPageGuard sits on that setup page and lets it open only while the backend still allows the
 * first start, otherwise it leads to the login page. A signed-in user is never redirected to the first start.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FIRST_START_ROUTE_PATH } from 'src/app/domain/constants/setup.constants';
import { FirstStartSetupStatusService } from 'src/app/domain/services/setup/first-start-setup-status.service';
import { AuthService } from './auth.service';

const LOGIN_ROUTE = '/login';

export const firstStartLoginGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const firstStartStatus = inject(FirstStartSetupStatusService);
  const router = inject(Router);

  if (authService.authenticated()) {
    return true;
  }

  return (await firstStartStatus.isPending()) ? router.createUrlTree([`/${FIRST_START_ROUTE_PATH}`]) : true;
};

export const firstStartPageGuard: CanActivateFn = async () => {
  const firstStartStatus = inject(FirstStartSetupStatusService);
  const router = inject(Router);

  return (await firstStartStatus.isPending()) ? true : router.createUrlTree([LOGIN_ROUTE]);
};
