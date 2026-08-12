// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect } from 'vitest';

import {
  getDataSource,
  REPORT_DATA_SOURCES,
  SHIFT_FILTER_TYPE_TO_REPORT_SOURCE,
} from './report-data-source.model';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';

describe('REPORT_DATA_SOURCES', () => {
  it('has a unique id per data source', () => {
    const ids = REPORT_DATA_SOURCES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('carries the three shift sources with the shared shifts data set', () => {
    for (const id of ['shift-table', 'shift-table-cut', 'shift-table-container']) {
      const source = getDataSource(id);
      expect(source, id).toBeDefined();
      expect(source!.dataSets.map(ds => ds.id)).toEqual(['shifts']);
    }
  });
});

describe('SHIFT_FILTER_TYPE_TO_REPORT_SOURCE', () => {
  it('maps every printable shift filter mode to its report source', () => {
    expect(SHIFT_FILTER_TYPE_TO_REPORT_SOURCE[ShiftFilterType.Original]).toBe('shift-table');
    expect(SHIFT_FILTER_TYPE_TO_REPORT_SOURCE[ShiftFilterType.Shift]).toBe('shift-table-cut');
    expect(SHIFT_FILTER_TYPE_TO_REPORT_SOURCE[ShiftFilterType.Container]).toBe('shift-table-container');
  });

  it('offers no report source for the absence filter mode', () => {
    expect(SHIFT_FILTER_TYPE_TO_REPORT_SOURCE[ShiftFilterType.Absence]).toBeUndefined();
  });
});
