// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Effective password rules of the backend's identity options, published by GET Setup/Status so a form can show
 * them before the user submits a password.
 */
export interface PasswordPolicy {
  requiredLength: number;
  requireDigit: boolean;
  requireNonAlphanumeric: boolean;
  requireUppercase: boolean;
  requireLowercase: boolean;
}
