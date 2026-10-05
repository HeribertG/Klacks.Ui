// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { normalizeIdentifierName } from './identifier-name';

interface ParityCase {
  left: string;
  right: string;
  backendEquals: boolean;
}

const BACKEND_ORDINAL_IGNORE_CASE_RESULTS: ParityCase[] = [
  { left: 'weekday', right: 'WEEKDAY', backendEquals: true },
  { left: 'HolidayNextDay', right: 'holidaynextday', backendEquals: true },
  { left: 'ä', right: 'Ä', backendEquals: true },
  { left: 'ß', right: 'ß', backendEquals: true },
  { left: 'ß', right: 'SS', backendEquals: false },
  { left: 'ß', right: 'ss', backendEquals: false },
  { left: 'ß', right: 'ẞ', backendEquals: false },
  { left: 'İ', right: 'i', backendEquals: false },
  { left: 'İ', right: 'I', backendEquals: false },
  { left: 'İ', right: 'i̇', backendEquals: false },
  { left: 'ı', right: 'I', backendEquals: false },
  { left: 'ı', right: 'i', backendEquals: false },
  { left: 'ſ', right: 'S', backendEquals: false },
  { left: 'ǆ', right: 'ǅ', backendEquals: true },
  { left: 'ǆ', right: 'Ǆ', backendEquals: true },
  { left: 'µ', right: 'Μ', backendEquals: true },
  { left: 'ÿ', right: 'Ÿ', backendEquals: true },
  { left: 'ǰ', right: 'J', backendEquals: false },
  { left: 'ς', right: 'Σ', backendEquals: true },
];

describe('normalizeIdentifierName (parity with .NET StringComparison.OrdinalIgnoreCase)', () => {
  it.each(BACKEND_ORDINAL_IGNORE_CASE_RESULTS)(
    'treats "$left" and "$right" as equal = $backendEquals, like the backend',
    ({ left, right, backendEquals }) => {
      const equal = normalizeIdentifierName(left) === normalizeIdentifierName(right);

      expect(equal).toBe(backendEquals);
    }
  );

  it('never changes the length of an identifier', () => {
    const name = 'Straßeİıǰ';

    expect(normalizeIdentifierName(name).length).toBe(name.length);
  });

  it('known divergence: a character whose full upper case expands keeps its form, while .NET maps U+1FB3 to U+1FBC', () => {
    expect(normalizeIdentifierName('ᾳ')).not.toBe(normalizeIdentifierName('ᾼ'));
  });
});
