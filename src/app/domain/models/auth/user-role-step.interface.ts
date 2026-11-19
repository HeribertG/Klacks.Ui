// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One role change that is sent to the backend when an account moves to another rights level.
 * @param roleName - Role that is granted or withdrawn
 * @param isSelected - True grants the role, false withdraws it
 */
export interface UserRoleStep {
  roleName: 'Admin' | 'Authorised';
  isSelected: boolean;
}
