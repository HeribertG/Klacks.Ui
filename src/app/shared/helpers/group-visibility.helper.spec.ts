// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { isOutsideVisibleGroups } from './group-visibility.helper';

describe('isOutsideVisibleGroups', () => {
  const visible = new Set(['a', 'b']);

  it('is false while the tree has not been read', () => {
    expect(isOutsideVisibleGroups(undefined, 'x')).toBe(false);
  });

  it('is false for a new row without a group', () => {
    expect(isOutsideVisibleGroups(visible, undefined)).toBe(false);
    expect(isOutsideVisibleGroups(visible, '')).toBe(false);
  });

  it('is false for a group of the tree', () => {
    expect(isOutsideVisibleGroups(visible, 'a')).toBe(false);
  });

  it('is true for a group missing from the tree', () => {
    expect(isOutsideVisibleGroups(visible, 'hidden')).toBe(true);
  });

  it('is true for every group when the caller sees no group at all', () => {
    expect(isOutsideVisibleGroups(new Set<string>(), 'a')).toBe(true);
  });
});
