// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach } from 'vitest';
import { ContainerSplitLogicService } from './container-split-logic.service';
import {
  ContainerWorkChildren,
  SubBreakResource,
  SubWorkResource,
  WorkChangeResource,
} from 'src/app/infrastructure/api/schedule/data-container-work-children.service';

const makeSubWork = (
  id: string,
  startTime: string,
  endTime: string,
  abbreviation?: string,
): SubWorkResource => ({
  id,
  shiftId: 's1',
  clientId: 'c1',
  currentDate: '2026-01-01',
  startTime,
  endTime,
  workTime: 0,
  parentWorkId: 'p1',
  information: null,
  transportMode: null,
  startBase: null,
  endBase: null,
  shift: abbreviation
    ? {
        id: 's1',
        name: abbreviation,
        abbreviation,
        startShift: startTime,
        endShift: endTime,
        workTime: 0,
        clientId: 'c1',
        isTimeRange: false,
        isSporadic: false,
      }
    : undefined,
});

const makeSubBreak = (id: string, startTime: string, endTime: string): SubBreakResource => ({
  id,
  absenceId: 'a1',
  clientId: 'c1',
  currentDate: '2026-01-01',
  startTime,
  endTime,
  workTime: 0,
  parentWorkId: 'p1',
});

const makeWorkChange = (id: string, workId: string): WorkChangeResource => ({
  id,
  workId,
  changeTime: 0,
  surcharges: 0,
  startTime: '00:00:00',
  endTime: '00:00:00',
  type: 0,
  replaceClientId: null,
  description: '',
  toInvoice: false,
});

const makeChildren = (
  subWorks: SubWorkResource[],
  subBreaks: SubBreakResource[] = [],
  subWorkChanges: WorkChangeResource[] = [],
): ContainerWorkChildren => ({ subWorks, subBreaks, subWorkChanges });

const DEMO_TASKS = [
  makeSubWork('fzk', '07:15:00', '08:30:00', 'FZK'),
  makeSubWork('wan', '09:00:00', '10:15:00', 'WAN'),
  makeSubWork('obg', '10:30:00', '11:30:00', 'OBG'),
  makeSubWork('dok', '13:00:00', '14:30:00', 'DOK'),
];

describe('ContainerSplitLogicService', () => {
  let service: ContainerSplitLogicService;

  beforeEach(() => {
    service = new ContainerSplitLogicService();
  });

  describe('computeSplitGaps', () => {
    it('offers one gap between each pair of consecutive tasks, starting at the end of the earlier task', () => {
      const gaps = service.computeSplitGaps(makeChildren(DEMO_TASKS), '07:00', '15:00');

      expect(gaps.map((g) => [g.start, g.end])).toEqual([
        ['08:30', '09:00'],
        ['10:15', '10:30'],
        ['11:30', '13:00'],
      ]);
    });

    it('labels each gap with the abbreviations of the neighbouring tasks', () => {
      const gaps = service.computeSplitGaps(makeChildren(DEMO_TASKS), '07:00', '15:00');

      expect(gaps[2].beforeLabel).toBe('OBG');
      expect(gaps[2].afterLabel).toBe('DOK');
    });

    it('offers no gap before the first or after the last task', () => {
      const gaps = service.computeSplitGaps(
        makeChildren([makeSubWork('1', '09:00', '10:00'), makeSubWork('2', '11:00', '12:00')]),
        '07:00',
        '15:00',
      );

      expect(gaps).toHaveLength(1);
      expect(gaps[0].start).toBe('10:00');
      expect(gaps[0].end).toBe('11:00');
    });

    it('offers a zero-width split point when two tasks touch', () => {
      const gaps = service.computeSplitGaps(
        makeChildren([makeSubWork('1', '08:00', '10:00'), makeSubWork('2', '10:00', '12:00')]),
        '08:00',
        '12:00',
      );

      expect(gaps.map((g) => [g.start, g.end])).toEqual([['10:00', '10:00']]);
    });

    it('offers no split point when the container holds fewer than two tasks', () => {
      expect(service.computeSplitGaps(makeChildren([]), '08:00', '16:00')).toEqual([]);
      expect(
        service.computeSplitGaps(makeChildren([makeSubWork('1', '09:00', '10:00')]), '08:00', '16:00'),
      ).toEqual([]);
    });

    it('never cuts through an absence and offers the gaps on both sides of it', () => {
      const gaps = service.computeSplitGaps(
        makeChildren(
          [makeSubWork('1', '08:00', '10:00'), makeSubWork('2', '13:00', '15:00')],
          [makeSubBreak('b', '11:00', '12:00')],
        ),
        '08:00',
        '15:00',
      );

      expect(gaps.map((g) => [g.start, g.end])).toEqual([
        ['10:00', '11:00'],
        ['12:00', '13:00'],
      ]);
    });

    it('offers no gap that would leave one half with absences only', () => {
      const gaps = service.computeSplitGaps(
        makeChildren(
          [makeSubWork('1', '08:00', '10:00'), makeSubWork('2', '11:00', '12:00')],
          [makeSubBreak('b', '13:00', '14:00')],
        ),
        '08:00',
        '15:00',
      );

      expect(gaps.map((g) => [g.start, g.end])).toEqual([['10:00', '11:00']]);
    });

    it('offers no gap where overlapping items cover the time between two tasks', () => {
      const gaps = service.computeSplitGaps(
        makeChildren(
          [
            makeSubWork('1', '08:00', '12:00'),
            makeSubWork('2', '09:00', '10:00'),
            makeSubWork('3', '11:00', '13:00'),
          ],
        ),
        '08:00',
        '14:00',
      );

      expect(gaps).toEqual([]);
    });

    it('handles containers crossing midnight', () => {
      const gaps = service.computeSplitGaps(
        makeChildren([makeSubWork('1', '22:30', '23:30'), makeSubWork('2', '01:00', '02:00')]),
        '22:00',
        '04:00',
      );

      expect(gaps.map((g) => [g.start, g.end])).toEqual([['23:30', '01:00']]);
    });
  });

  describe('isSplitTimeValid', () => {
    const gaps = () => service.computeSplitGaps(makeChildren(DEMO_TASKS), '07:00', '15:00');

    it('accepts any time inside a gap including its bounds', () => {
      expect(service.isSplitTimeValid('11:30', gaps(), '07:00')).toBe(true);
      expect(service.isSplitTimeValid('12:00', gaps(), '07:00')).toBe(true);
      expect(service.isSplitTimeValid('13:00', gaps(), '07:00')).toBe(true);
    });

    it('rejects a time that cuts through a task', () => {
      expect(service.isSplitTimeValid('11:00', gaps(), '07:00')).toBe(false);
      expect(service.isSplitTimeValid('14:00', gaps(), '07:00')).toBe(false);
    });

    it('rejects a time before the first or after the last task', () => {
      expect(service.isSplitTimeValid('07:05', gaps(), '07:00')).toBe(false);
      expect(service.isSplitTimeValid('14:45', gaps(), '07:00')).toBe(false);
    });

    it('rejects an empty split time', () => {
      expect(service.isSplitTimeValid('', gaps(), '07:00')).toBe(false);
    });

    it('accepts a time inside a gap that crosses midnight', () => {
      const overnight = service.computeSplitGaps(
        makeChildren([makeSubWork('1', '22:30', '23:30'), makeSubWork('2', '01:00', '02:00')]),
        '22:00',
        '04:00',
      );

      expect(service.isSplitTimeValid('00:15', overnight, '22:00')).toBe(true);
      expect(service.isSplitTimeValid('23:00', overnight, '22:00')).toBe(false);
    });
  });

  describe('categorizeItems', () => {
    it('distributes the demo tasks at 12:00 into FZK, WAN, OBG and DOK', () => {
      const result = service.categorizeItems(makeChildren(DEMO_TASKS), '12:00', '07:00');

      expect(result.beforeWorks.map((w) => w.id)).toEqual(['fzk', 'wan', 'obg']);
      expect(result.afterWorks.map((w) => w.id)).toEqual(['dok']);
    });

    it('keeps a task ending exactly at the split time before and one starting there after', () => {
      const result = service.categorizeItems(
        makeChildren([makeSubWork('1', '08:00', '10:00'), makeSubWork('2', '10:00', '12:00')]),
        '10:00',
        '08:00',
      );

      expect(result.beforeWorks.map((w) => w.id)).toEqual(['1']);
      expect(result.afterWorks.map((w) => w.id)).toEqual(['2']);
    });

    it('moves absences whole, never splitting them', () => {
      const result = service.categorizeItems(
        makeChildren(
          [makeSubWork('1', '08:00', '10:00'), makeSubWork('2', '13:00', '15:00')],
          [makeSubBreak('b1', '10:15', '10:45'), makeSubBreak('b2', '12:00', '12:30')],
        ),
        '11:00',
        '08:00',
      );

      expect(result.beforeBreaks).toEqual([makeSubBreak('b1', '10:15', '10:45')]);
      expect(result.afterBreaks).toEqual([makeSubBreak('b2', '12:00', '12:30')]);
    });

    it('moves the work changes together with their task', () => {
      const result = service.categorizeItems(
        makeChildren(
          [makeSubWork('1', '08:00', '10:00'), makeSubWork('2', '13:00', '15:00')],
          [],
          [makeWorkChange('wc1', '1'), makeWorkChange('wc2', '2')],
        ),
        '11:00',
        '08:00',
      );

      expect(result.beforeWorkChanges.map((wc) => wc.id)).toEqual(['wc1']);
      expect(result.afterWorkChanges.map((wc) => wc.id)).toEqual(['wc2']);
    });

    it('distributes the items of a container crossing midnight', () => {
      const result = service.categorizeItems(
        makeChildren([makeSubWork('1', '22:30', '23:30'), makeSubWork('2', '01:00', '02:00')]),
        '00:00',
        '22:00',
      );

      expect(result.beforeWorks.map((w) => w.id)).toEqual(['1']);
      expect(result.afterWorks.map((w) => w.id)).toEqual(['2']);
    });
  });
});
