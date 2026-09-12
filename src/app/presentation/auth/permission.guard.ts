// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Route guard that demands the right a route declares in data[ROUTE_DATA_REQUIRED_PERMISSION].
 * A route carrying this guard without that entry is refused rather than let through: the entry is
 * the only thing the guard can check, so a missing one is a routing defect, and passing would open
 * the page to everyone silently. klacksy-page-keys-guard.spec pins both directions of that pairing.
 * The refusal reason is recorded before the redirect, so a caller awaiting the navigation can tell
 * a missing right apart from a feature that is not activated.
 */
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import {
  NO_ACCESS_REASON_PERMISSION,
  NO_ACCESS_REASON_QUERY_PARAM,
} from 'src/app/domain/constants/no-access-reason.constants';
import { NoAccessReasonService } from 'src/app/domain/services/navigation/no-access-reason.service';
import { ROUTE_DATA_REQUIRED_PERMISSION } from './route-data.constants';

const NO_ACCESS_ROUTE = '/no-access';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authorizationService = inject(AuthorizationService);
  const noAccessReason = inject(NoAccessReasonService);
  const router = inject(Router);

  const requiredPermission = route.data?.[ROUTE_DATA_REQUIRED_PERMISSION] as string | undefined;
  if (requiredPermission && authorizationService.hasPermission(requiredPermission)) {
    return true;
  }

  noAccessReason.set(NO_ACCESS_REASON_PERMISSION);
  router.navigate([NO_ACCESS_ROUTE], {
    queryParams: { [NO_ACCESS_REASON_QUERY_PARAM]: NO_ACCESS_REASON_PERMISSION },
  });
  return false;
};
