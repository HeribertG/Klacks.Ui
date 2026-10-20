// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read access to the signed-in user's rights for layers that must not depend on the application layer, and the
 * token through which it is provided.
 * @param hasPermission - True when the user holds the given permission constant or role name (admins hold all)
 * @param isAdmin - True when the user holds the full-access role
 */
import { InjectionToken } from '@angular/core';

export interface IPermissionChecker {
  hasPermission(permission: string): boolean;
  readonly isAdmin: boolean;
}

export const PERMISSION_CHECKER = new InjectionToken<IPermissionChecker>('IPermissionChecker');
