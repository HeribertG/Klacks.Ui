// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Response body for GET Setup/Status and GET Setup/FirstStartStatus. The anonymous first-start answer carries no
 * password policy once the installation can no longer be claimed.
 */
import { PasswordPolicy } from './password-policy.interface';

export interface SetupStatus {
  requiresOwnAdmin: boolean;
  passwordPolicy: PasswordPolicy | null;
}
