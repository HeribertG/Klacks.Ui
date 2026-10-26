// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ShiftFilter } from './shift-filter-class';
import { ShiftFilterType } from '../../enums/shift-filter-type.enum';

describe('ShiftFilter location and validity period fields', () => {
  it('starts without location restriction or period and counts as default', () => {
    const filter = new ShiftFilter();

    expect(filter.countries).toEqual([]);
    expect(filter.states).toEqual([]);
    expect(filter.city).toBe('');
    expect(filter.zipPrefix).toBe('');
    expect(filter.validFrom).toBeUndefined();
    expect(filter.validUntil).toBeUndefined();
    expect(filter.isDefault()).toBe(true);
  });

  it('is no longer default once a country or state is picked', () => {
    const withCountry = new ShiftFilter();
    withCountry.countries = ['CH'];
    const withState = new ShiftFilter();
    withState.states = [{ state: 'BE', country: 'CH' }];

    expect(withCountry.isDefault()).toBe(false);
    expect(withState.isDefault()).toBe(false);
  });

  it.each(['city', 'zipPrefix'] as const)('is no longer default once %s is set', (field) => {
    const filter = new ShiftFilter();

    filter[field] = 'x';

    expect(filter.isDefault()).toBe(false);
  });

  it.each(['validFrom', 'validUntil'] as const)('is no longer default once %s is chosen', (field) => {
    const filter = new ShiftFilter();

    filter[field] = new Date(2026, 2, 1);

    expect(filter.isDefault()).toBe(false);
  });

  it('is default again after everything is cleared', () => {
    const filter = new ShiftFilter();
    filter.countries = ['CH'];
    filter.states = [{ state: 'BE', country: 'CH' }];
    filter.zipPrefix = '80';
    filter.validFrom = new Date(2026, 2, 1);
    filter.validUntil = new Date(2026, 2, 31);

    filter.countries = [];
    filter.states = [];
    filter.zipPrefix = '';
    filter.validFrom = undefined;
    filter.validUntil = undefined;

    expect(filter.isDefault()).toBe(true);
  });

  it('leaves the existing scopeFrom and scopeUntil untouched by the validity period', () => {
    const filter = new ShiftFilter();
    filter.validFrom = new Date(2026, 2, 1);

    expect(filter.scopeFrom).toBeUndefined();
    expect(filter.scopeUntil).toBeUndefined();
  });

  it('serializes the lists with the camelCase names the backend expects', () => {
    const filter = new ShiftFilter();
    filter.countries = ['CH'];
    filter.states = [{ state: 'BE', country: 'CH' }];
    filter.city = 'Zürich';
    filter.zipPrefix = '80';

    const body = JSON.parse(JSON.stringify(filter));

    expect(body.countries).toEqual(['CH']);
    expect(body.states).toEqual([{ state: 'BE', country: 'CH' }]);
    expect(body.city).toBe('Zürich');
    expect(body.zipPrefix).toBe('80');
  });

  it('detects the unsealed draft view only for original, unsealed orders', () => {
    const filter = new ShiftFilter();
    expect(filter.isUnsealedDraftView).toBe(true);

    filter.isSealedOrder = true;
    expect(filter.isUnsealedDraftView).toBe(false);

    filter.isSealedOrder = false;
    filter.filterType = ShiftFilterType.Container;
    expect(filter.isUnsealedDraftView).toBe(false);
  });
});
