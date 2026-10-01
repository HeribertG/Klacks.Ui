// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for chronological sorting of container template items.
 * @param sortContainerItemsChronologically - Must order items by their effective start time
 */
import { describe, it, expect } from 'vitest';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { sortContainerItemsChronologically } from './container-template-sort.helper';

const fixedItem = (
  id: string,
  start: string,
  storedTimeRangeStart: string | null,
): IContainerTemplateItem =>
  ({
    id,
    shiftId: id,
    shift: { isTimeRange: false } as IShift,
    startItem: start,
    endItem: '23:00:00',
    timeRangeStartItem: storedTimeRangeStart,
    timeRangeEndItem: storedTimeRangeStart,
  }) as IContainerTemplateItem;

const timeRangeItem = (id: string, timeRangeStart: string): IContainerTemplateItem =>
  ({
    id,
    shiftId: id,
    shift: { isTimeRange: true } as IShift,
    startItem: '06:00:00',
    endItem: '23:00:00',
    timeRangeStartItem: timeRangeStart,
    timeRangeEndItem: '23:00:00',
  }) as IContainerTemplateItem;

const absenceItem = (id: string, start: string): IContainerTemplateItem =>
  ({
    id,
    absenceId: id,
    startItem: start,
    endItem: '23:00:00',
    timeRangeStartItem: '00:00:00',
    timeRangeEndItem: '00:00:00',
  }) as IContainerTemplateItem;

const ids = (items: IContainerTemplateItem[]): (string | undefined)[] =>
  items.map((item) => item.id);

describe('sortContainerItemsChronologically', () => {
  it('should sort fixed-time shifts by start despite a stored 00:00:00 time range', () => {
    const items = [
      fixedItem('late', '14:00:00', '00:00:00'),
      fixedItem('early', '08:00:00', '00:00:00'),
      fixedItem('middle', '11:00:00', null),
    ];

    expect(ids(sortContainerItemsChronologically(items, '06:00', '22:00'))).toEqual([
      'early',
      'middle',
      'late',
    ]);
  });

  it('should sort time-range shifts by their time range start', () => {
    const items = [timeRangeItem('b', '13:00:00'), timeRangeItem('a', '09:00:00')];

    expect(ids(sortContainerItemsChronologically(items, '06:00', '22:00'))).toEqual(['a', 'b']);
  });

  it('should sort absences by their fixed start', () => {
    const items = [fixedItem('shift', '14:00:00', null), absenceItem('break', '12:00:00')];

    expect(ids(sortContainerItemsChronologically(items, '06:00', '22:00'))).toEqual([
      'break',
      'shift',
    ]);
  });

  it('should put items after the container start first when the container crosses midnight', () => {
    const items = [
      fixedItem('after-midnight', '01:00:00', '00:00:00'),
      fixedItem('evening', '23:00:00', '00:00:00'),
    ];

    expect(ids(sortContainerItemsChronologically(items, '22:00', '06:00'))).toEqual([
      'evening',
      'after-midnight',
    ]);
  });

  it('should not mutate the input array', () => {
    const items = [fixedItem('b', '14:00:00', null), fixedItem('a', '08:00:00', null)];

    sortContainerItemsChronologically(items, '06:00', '22:00');

    expect(ids(items)).toEqual(['b', 'a']);
  });
});
