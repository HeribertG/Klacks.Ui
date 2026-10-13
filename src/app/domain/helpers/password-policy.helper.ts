// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Checks a password against the backend password policy with the character classes of ASP.NET Identity's
 * PasswordValidator, so the form and the server agree: digits and letters are ASCII only, every other character
 * (including accented letters) counts as non-alphanumeric, the length is counted in UTF-16 code units and a
 * whitespace-only password is always too short. Only the rules the policy demands are returned.
 * @param policy - Effective password policy of the backend
 * @param password - Password typed so far
 */
import { PASSWORD_RULE } from 'src/app/domain/constants/password-policy.constants';
import { PasswordPolicy } from 'src/app/domain/models/setup/password-policy.interface';
import { PasswordRuleResult } from 'src/app/domain/models/setup/password-rule-result.interface';

const ASCII_DIGIT = /[0-9]/;
const ASCII_UPPERCASE = /[A-Z]/;
const ASCII_LOWERCASE = /[a-z]/;
const NON_ASCII_ALPHANUMERIC = /[^0-9A-Za-z]/;

export function evaluatePasswordRules(policy: PasswordPolicy, password: string): PasswordRuleResult[] {
  const rules: PasswordRuleResult[] = [];

  if (policy.requiredLength > 0) {
    rules.push({
      id: PASSWORD_RULE.LENGTH,
      met: password.trim().length > 0 && password.length >= policy.requiredLength,
    });
  }
  if (policy.requireDigit) {
    rules.push({ id: PASSWORD_RULE.DIGIT, met: ASCII_DIGIT.test(password) });
  }
  if (policy.requireNonAlphanumeric) {
    rules.push({ id: PASSWORD_RULE.NON_ALPHANUMERIC, met: NON_ASCII_ALPHANUMERIC.test(password) });
  }
  if (policy.requireUppercase) {
    rules.push({ id: PASSWORD_RULE.UPPERCASE, met: ASCII_UPPERCASE.test(password) });
  }
  if (policy.requireLowercase) {
    rules.push({ id: PASSWORD_RULE.LOWERCASE, met: ASCII_LOWERCASE.test(password) });
  }

  return rules;
}

/** Accepts a password policy only when every rule is present with the expected type (older backends send none). */
export function isPasswordPolicy(value: unknown): value is PasswordPolicy {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const policy = value as Record<string, unknown>;
  return (
    typeof policy['requiredLength'] === 'number' &&
    typeof policy['requireDigit'] === 'boolean' &&
    typeof policy['requireNonAlphanumeric'] === 'boolean' &&
    typeof policy['requireUppercase'] === 'boolean' &&
    typeof policy['requireLowercase'] === 'boolean'
  );
}
