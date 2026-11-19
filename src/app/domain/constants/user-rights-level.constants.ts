// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The three rights levels an account can have in user administration. Planner is the level without any role,
 * Supervisor is the role Authorised only and Admin is the role Admin only (Admin includes everything a Supervisor may).
 */
export const USER_RIGHTS_LEVEL = {
  Planner: 'planner',
  Supervisor: 'supervisor',
  Admin: 'admin',
} as const;

export type UserRightsLevel = (typeof USER_RIGHTS_LEVEL)[keyof typeof USER_RIGHTS_LEVEL];
