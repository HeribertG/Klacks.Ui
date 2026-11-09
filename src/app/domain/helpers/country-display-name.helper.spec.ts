// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { countryDisplayName } from './country-display-name.helper';

describe('countryDisplayName', () => {
  it('names the country in the requested language', () => {
    expect(countryDisplayName('CH', 'de')).toBe('Schweiz');
    expect(countryDisplayName('CH', 'en')).toBe('Switzerland');
  });

  it('accepts a lower-case code with surrounding whitespace', () => {
    expect(countryDisplayName(' de ', 'fr')).toBe('Allemagne');
  });

  it('returns an empty string for an empty code', () => {
    expect(countryDisplayName('', 'de')).toBe('');
  });

  it('falls back to the code when the code is not a valid region', () => {
    expect(countryDisplayName('C1', 'de')).toBe('C1');
  });
});
