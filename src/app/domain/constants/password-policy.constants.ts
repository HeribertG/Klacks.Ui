// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Password rules a backend password policy can demand, in display order, and the account registration rejection
 * reason the backend reports when a rule is not met.
 * @param PASSWORD_RULE - Ids of the rules
 * @param PASSWORD_RULE_REJECTION_REASON - Rejection reason code that belongs to an unmet rule
 */
import { ACCOUNT_REGISTRATION_REASONS } from './account-registration.constants';

export const PASSWORD_RULE = {
  LENGTH: 'length',
  DIGIT: 'digit',
  NON_ALPHANUMERIC: 'nonAlphanumeric',
  UPPERCASE: 'uppercase',
  LOWERCASE: 'lowercase',
} as const;

export type PasswordRuleId = (typeof PASSWORD_RULE)[keyof typeof PASSWORD_RULE];

export const PASSWORD_RULE_REJECTION_REASON: Readonly<Record<PasswordRuleId, string>> = {
  [PASSWORD_RULE.LENGTH]: ACCOUNT_REGISTRATION_REASONS.PASSWORD_TOO_SHORT,
  [PASSWORD_RULE.DIGIT]: ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_DIGIT,
  [PASSWORD_RULE.NON_ALPHANUMERIC]: ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_NON_ALPHANUMERIC,
  [PASSWORD_RULE.UPPERCASE]: ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_UPPER,
  [PASSWORD_RULE.LOWERCASE]: ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_LOWER,
};
