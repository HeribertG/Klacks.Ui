// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PASSWORD_RULE } from 'src/app/domain/constants/password-policy.constants';
import { PasswordPolicy } from 'src/app/domain/models/setup/password-policy.interface';
import { evaluatePasswordRules, isPasswordPolicy } from './password-policy.helper';

const REQUIRED_LENGTH = 8;

const CURRENT_POLICY: PasswordPolicy = {
  requiredLength: REQUIRED_LENGTH,
  requireDigit: true,
  requireNonAlphanumeric: true,
  requireUppercase: false,
  requireLowercase: false,
};

const STRICT_POLICY: PasswordPolicy = {
  requiredLength: REQUIRED_LENGTH,
  requireDigit: true,
  requireNonAlphanumeric: true,
  requireUppercase: true,
  requireLowercase: true,
};

const metById = (policy: PasswordPolicy, password: string): Record<string, boolean> =>
  Object.fromEntries(evaluatePasswordRules(policy, password).map((rule) => [rule.id, rule.met]));

describe('evaluatePasswordRules', () => {
  it('returns only the rules the policy demands, in display order', () => {
    const ids = evaluatePasswordRules(CURRENT_POLICY, '').map((rule) => rule.id);

    expect(ids).toEqual([PASSWORD_RULE.LENGTH, PASSWORD_RULE.DIGIT, PASSWORD_RULE.NON_ALPHANUMERIC]);
  });

  it('returns all five rules for a strict policy', () => {
    const ids = evaluatePasswordRules(STRICT_POLICY, '').map((rule) => rule.id);

    expect(ids).toEqual([
      PASSWORD_RULE.LENGTH,
      PASSWORD_RULE.DIGIT,
      PASSWORD_RULE.NON_ALPHANUMERIC,
      PASSWORD_RULE.UPPERCASE,
      PASSWORD_RULE.LOWERCASE,
    ]);
  });

  it('marks every rule unmet for an empty password', () => {
    expect(evaluatePasswordRules(STRICT_POLICY, '').every((rule) => !rule.met)).toBe(true);
  });

  it('marks every rule met for a password that satisfies the strict policy', () => {
    expect(evaluatePasswordRules(STRICT_POLICY, 'Sup3rSecret!').every((rule) => rule.met)).toBe(true);
  });

  it('counts the length up to the required minimum', () => {
    expect(metById(CURRENT_POLICY, 'a1!a1!a')[PASSWORD_RULE.LENGTH]).toBe(false);
    expect(metById(CURRENT_POLICY, 'a1!a1!ab')[PASSWORD_RULE.LENGTH]).toBe(true);
  });

  it('treats a whitespace-only password as too short, like Identity', () => {
    expect(metById(CURRENT_POLICY, ' '.repeat(REQUIRED_LENGTH))[PASSWORD_RULE.LENGTH]).toBe(false);
  });

  it('counts accented letters as special characters and not as letters, like Identity', () => {
    const met = metById(STRICT_POLICY, 'ÄÖÜäöü');

    expect(met[PASSWORD_RULE.NON_ALPHANUMERIC]).toBe(true);
    expect(met[PASSWORD_RULE.UPPERCASE]).toBe(false);
    expect(met[PASSWORD_RULE.LOWERCASE]).toBe(false);
  });

  it('does not count non-ASCII digits as digits, like Identity', () => {
    expect(metById(CURRENT_POLICY, '١٢٣')[PASSWORD_RULE.DIGIT]).toBe(false);
  });

  it('recognises each character class on its own', () => {
    const met = metById(STRICT_POLICY, 'A');

    expect(met[PASSWORD_RULE.UPPERCASE]).toBe(true);
    expect(met[PASSWORD_RULE.LOWERCASE]).toBe(false);
    expect(met[PASSWORD_RULE.DIGIT]).toBe(false);
    expect(met[PASSWORD_RULE.NON_ALPHANUMERIC]).toBe(false);
  });

  it('omits the length rule when the policy demands no minimum length', () => {
    const ids = evaluatePasswordRules({ ...CURRENT_POLICY, requiredLength: 0 }, '').map((rule) => rule.id);

    expect(ids).not.toContain(PASSWORD_RULE.LENGTH);
  });
});

describe('isPasswordPolicy', () => {
  it('accepts a complete policy', () => {
    expect(isPasswordPolicy(CURRENT_POLICY)).toBe(true);
  });

  it.each([undefined, null, 'policy', {}])('rejects %s', (value) => {
    expect(isPasswordPolicy(value)).toBe(false);
  });

  it('rejects a policy with a missing rule', () => {
    const { requireLowercase: _omitted, ...incomplete } = CURRENT_POLICY;

    expect(isPasswordPolicy(incomplete)).toBe(false);
  });

  it('rejects a policy with a wrongly typed rule', () => {
    expect(isPasswordPolicy({ ...CURRENT_POLICY, requiredLength: '8' })).toBe(false);
  });
});
