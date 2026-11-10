// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Response body for GET Setup/Status and GET Setup/FirstStartStatus. The anonymous first-start answer carries no
 * password policy once the installation can no longer be claimed; requiresSetupCode is true when the first start of
 * this browser needs the installer's one-time setup code (always false for GET Setup/Status).
 */
import { PasswordPolicy } from './password-policy.interface';

export interface SetupStatus {
  requiresOwnAdmin: boolean;
  passwordPolicy: PasswordPolicy | null;
  requiresSetupCode: boolean;
}
