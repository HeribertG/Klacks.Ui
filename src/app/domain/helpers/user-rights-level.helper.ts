// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Maps an account to its single rights level and plans the role changes needed to reach another level.
 * An account that has both roles counts as Admin. Withdrawing Admin always comes first: it is the only change the
 * backend can refuse (the last active administrator), and then nothing has changed yet. All other grants come before
 * the withdrawal of Authorised, so a later failure leaves the account with too few rights, never with too many.
 * @param account - Account whose role flags are read
 * @param target - Rights level the account should end up with
 */
import { ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';
import { USER_RIGHTS_LEVEL, UserRightsLevel } from 'src/app/domain/constants/user-rights-level.constants';
import { IAuthentication } from 'src/app/domain/models/authentication.interface';
import { UserRoleStep } from 'src/app/domain/models/auth/user-role-step.interface';

type RoleFlags = Pick<IAuthentication, 'isAdmin' | 'isAuthorised'>;

export function userRightsLevelOf(account: RoleFlags): UserRightsLevel {
  if (account.isAdmin) {
    return USER_RIGHTS_LEVEL.Admin;
  }
  return account.isAuthorised ? USER_RIGHTS_LEVEL.Supervisor : USER_RIGHTS_LEVEL.Planner;
}

export function planUserRightsChange(account: RoleFlags, target: UserRightsLevel): UserRoleStep[] {
  const wantsAdmin = target === USER_RIGHTS_LEVEL.Admin;
  const wantsAuthorised = target === USER_RIGHTS_LEVEL.Supervisor;
  const hasAdmin = !!account.isAdmin;
  const hasAuthorised = !!account.isAuthorised;

  const steps: UserRoleStep[] = [];
  if (!wantsAdmin && hasAdmin) {
    steps.push({ roleName: ROLE_ADMIN, isSelected: false });
  }
  if (wantsAdmin && !hasAdmin) {
    steps.push({ roleName: ROLE_ADMIN, isSelected: true });
  }
  if (wantsAuthorised && !hasAuthorised) {
    steps.push({ roleName: ROLE_AUTHORISED, isSelected: true });
  }
  if (!wantsAuthorised && hasAuthorised) {
    steps.push({ roleName: ROLE_AUTHORISED, isSelected: false });
  }
  return steps;
}
