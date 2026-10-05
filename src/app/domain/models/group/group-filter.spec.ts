// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { GroupFilter } from './group-class';
import { ShiftFilter } from '../shift/shift-data-class';

describe('GroupFilter.isDefault', () => {
  it('is true for a fresh filter', () => {
    expect(new GroupFilter().isDefault()).toBe(true);
  });

  it('is false once a date range or delete flag is changed', () => {
    const former = new GroupFilter();
    former.formerDateRange = true;
    expect(former.isDefault()).toBe(false);

    const deleted = new GroupFilter();
    deleted.showDeleteEntries = true;
    expect(deleted.isDefault()).toBe(false);
  });
});

describe('ShiftFilter.isDefault', () => {
  it('is true for a fresh filter', () => {
    expect(new ShiftFilter().isDefault()).toBe(true);
  });

  it('is false once a type, sporadic or date flag is changed', () => {
    const sporadic = new ShiftFilter();
    sporadic.isSporadic = false;
    expect(sporadic.isDefault()).toBe(false);

    const future = new ShiftFilter();
    future.futureDateRange = true;
    expect(future.isDefault()).toBe(false);
  });
});
