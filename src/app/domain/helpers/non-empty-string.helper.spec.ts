// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { toNonEmptyString } from './non-empty-string.helper';

describe('toNonEmptyString', () => {
  it('returns a non-empty string unchanged', () => {
    expect(toNonEmptyString('/workplace/shift')).toBe('/workplace/shift');
  });

  it.each([
    ['an empty string', ''],
    ['null', null],
    ['undefined', undefined],
    ['a number', 7],
    ['a boolean', true],
    ['an array', ['a']],
    ['an object', { id: 'a' }],
  ])('returns undefined for %s', (_label, value) => {
    expect(toNonEmptyString(value)).toBeUndefined();
  });
});
