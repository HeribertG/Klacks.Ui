// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { StateCountryToken } from 'src/app/domain/models/calendar/state-country-token-class';
import { sortStateTokens } from './state-token-sort.helper';

function token(state: string, country: string): StateCountryToken {
  const t = new StateCountryToken();
  t.state = state;
  t.country = country;
  return t;
}

describe('sortStateTokens', () => {
  it('sorts the Swiss cantons ascending by state code', () => {
    const unsorted = ['BL', 'BS', 'FR', 'GE', 'ZH', 'BE', 'VD', 'OW', 'TI', 'AG', 'AI', 'AR'].map((s) => token(s, 'CH'));

    const result = sortStateTokens(unsorted).map((t) => t.state);

    expect(result).toEqual(['AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'OW', 'TI', 'VD', 'ZH']);
  });

  it('does not mutate the input array', () => {
    const unsorted = [token('ZH', 'CH'), token('AG', 'CH')];

    sortStateTokens(unsorted);

    expect(unsorted.map((t) => t.state)).toEqual(['ZH', 'AG']);
  });

  it('orders equal state codes by country code', () => {
    const result = sortStateTokens([token('BE', 'DE'), token('BE', 'CH')]).map((t) => t.country);

    expect(result).toEqual(['CH', 'DE']);
  });

  it('ignores case and accents when comparing with a locale', () => {
    const result = sortStateTokens([token('ZH', 'CH'), token('ag', 'CH'), token('Ö1', 'AT'), token('OW', 'CH')], 'de').map((t) => t.state);

    expect(result).toEqual(['ag', 'Ö1', 'OW', 'ZH']);
  });
});
