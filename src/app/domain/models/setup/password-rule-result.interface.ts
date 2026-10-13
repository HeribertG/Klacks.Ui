// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Outcome of one password rule for the password typed so far.
 */
import { PasswordRuleId } from 'src/app/domain/constants/password-policy.constants';

export interface PasswordRuleResult {
  id: PasswordRuleId;
  met: boolean;
}
