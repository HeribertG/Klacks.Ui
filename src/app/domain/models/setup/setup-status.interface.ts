// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Response body for GET Setup/Status.
 */
import { PasswordPolicy } from './password-policy.interface';

export interface SetupStatus {
  requiresOwnAdmin: boolean;
  passwordPolicy: PasswordPolicy;
}
