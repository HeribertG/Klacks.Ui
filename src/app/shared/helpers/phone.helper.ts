// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pure functions for phone number formatting.
 * @param value - Phone number string (digits, optionally prefixed with '+')
 *
 * Uses lookup tables to define digit-group patterns per length range.
 * Each entry maps a length range to an array of group sizes that control spacing.
 */

interface FormatRule {
  readonly minLength: number;
  readonly maxLength: number;
  readonly groups: readonly number[];
}

const FORMAT_RULES_WITHOUT_CROSS: readonly FormatRule[] = [
  { minLength: 1, maxLength: 2, groups: [2] },
  { minLength: 3, maxLength: 5, groups: [3, 2] },
  { minLength: 6, maxLength: 6, groups: [3, 2, 2, 1] },
  { minLength: 7, maxLength: 7, groups: [3, 2, 2, 2] },
  { minLength: 8, maxLength: 9, groups: [3, 2, 2, 2] },
  { minLength: 10, maxLength: 10, groups: [3, 3, 2, 2, 1] },
  { minLength: 11, maxLength: 11, groups: [2, 3, 2, 2, 2] },
  { minLength: 12, maxLength: 12, groups: [2, 3, 2, 2, 2, 1] },
  { minLength: 13, maxLength: 13, groups: [4, 2, 3, 2, 2, 2] },
];

const FORMAT_RULES_WITHOUT_CROSS_FALLBACK: readonly number[] = [2, 3, 2, 2, 2, 2];

const FORMAT_RULES_WITH_CROSS: readonly FormatRule[] = [
  { minLength: 1, maxLength: 2, groups: [2] },
  { minLength: 3, maxLength: 5, groups: [2, 2, 1] },
  { minLength: 6, maxLength: 6, groups: [2, 2, 3, 1] },
  { minLength: 7, maxLength: 7, groups: [2, 2, 3, 2] },
  { minLength: 8, maxLength: 9, groups: [2, 2, 3, 2] },
  { minLength: 10, maxLength: 10, groups: [2, 2, 3, 2, 2] },
  { minLength: 11, maxLength: 11, groups: [2, 2, 3, 2, 2] },
  { minLength: 12, maxLength: 12, groups: [2, 2, 3, 2, 2, 1] },
  { minLength: 13, maxLength: 13, groups: [2, 2, 2, 2, 2, 2] },
];

const FORMAT_RULES_WITH_CROSS_FALLBACK: readonly number[] = [2, 3, 2, 2, 2, 2];

export function unformatPhoneNumber(value: string): string {
  if (!value) {
    return '';
  }
  return value.replace(/\D/g, '');
}

export function formatPhoneNumber(value: string): string {
  if (!value) {
    return '';
  }

  const hasCross = value.substring(0, 1) === '+';
  const digits = unformatPhoneNumber(value);

  if (!hasCross) {
    // The leading group of a number without a country code IS the area code
    // (e.g. "044" in "044 123 45 67") - wrap it in parentheses. A number with
    // a country code has no equivalent unambiguous group to bracket, so it is
    // left as plain space-grouped digits.
    return formatWithRules(digits, FORMAT_RULES_WITHOUT_CROSS, FORMAT_RULES_WITHOUT_CROSS_FALLBACK, true);
  }

  return '+' + formatWithRules(digits, FORMAT_RULES_WITH_CROSS, FORMAT_RULES_WITH_CROSS_FALLBACK, false);
}

function formatWithRules(
  value: string,
  rules: readonly FormatRule[],
  fallbackGroups: readonly number[],
  wrapAreaCode: boolean
): string {
  if (value.length === 0) {
    return '';
  }

  const matchedRule = rules.find(
    rule => value.length >= rule.minLength && value.length <= rule.maxLength
  );
  const groups = matchedRule ? matchedRule.groups : fallbackGroups;

  return applyGroupPattern(value, groups, wrapAreaCode);
}

function applyGroupPattern(value: string, groups: readonly number[], wrapAreaCode: boolean): string {
  const regexParts = groups.map(size => `(\\d{0,${size}})`).join('');
  const pattern = new RegExp(`^${regexParts}`);

  const replacementParts: string[] = [];
  for (let i = 1; i <= groups.length; i++) {
    replacementParts.push(wrapAreaCode && i === 1 ? `($${i})` : `$${i}`);
  }

  const formatted = value.replace(pattern, replacementParts.join(' '));
  return formatted.trimEnd();
}
