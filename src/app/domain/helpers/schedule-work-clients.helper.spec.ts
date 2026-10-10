// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { collectClientIdsWithWork } from './schedule-work-clients.helper';

const entry = (clientId: string, entryType: WorkScheduleEntryType) => ({ clientId, entryType });

describe('schedule-work-clients.helper', () => {
  it('reports no work for an empty schedule', () => {
    expect(collectClientIdsWithWork([]).size).toBe(0);
  });

  it('does not count breaks, work changes or expenses as work', () => {
    const entries = [
      entry('a', WorkScheduleEntryType.Break),
      entry('b', WorkScheduleEntryType.WorkChange),
      entry('c', WorkScheduleEntryType.Expenses),
    ];

    expect(collectClientIdsWithWork(entries).size).toBe(0);
  });

  it('collects each employee with a work once, whatever else they have', () => {
    const entries = [
      entry('a', WorkScheduleEntryType.Work),
      entry('a', WorkScheduleEntryType.Work),
      entry('a', WorkScheduleEntryType.Break),
      entry('b', WorkScheduleEntryType.Break),
      entry('c', WorkScheduleEntryType.Work),
    ];

    expect([...collectClientIdsWithWork(entries)].sort()).toEqual(['a', 'c']);
  });
});
