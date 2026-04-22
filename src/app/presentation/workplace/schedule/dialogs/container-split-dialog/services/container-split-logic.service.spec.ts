// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect, beforeEach } from 'vitest';
import { ContainerSplitLogicService } from './container-split-logic.service';
import {
  ContainerWorkChildren,
  SubBreakResource,
  SubWorkResource,
} from 'src/app/infrastructure/api/schedule/data-container-work-children.service';

const makeSubWork = (id: string, startTime: string, endTime: string): SubWorkResource => ({
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

const makeChildren = (
  subWorks: SubWorkResource[],
  subBreaks: SubBreakResource[],
): ContainerWorkChildren => ({ subWorks, subBreaks, subWorkChanges: [] });

describe('ContainerSplitLogicService', () => {
  let service: ContainerSplitLogicService;

  beforeEach(() => {
    service = new ContainerSplitLogicService();
  });

  describe('isSplitTimeValid', () => {
    it('returns true when splitTime is strictly within container bounds', () => {
      expect(service.isSplitTimeValid('12:00', '08:00', '16:00')).toBe(true);
    });

    it('returns false when splitTime equals container start', () => {
      expect(service.isSplitTimeValid('08:00', '08:00', '16:00')).toBe(false);
    });

    it('returns false when splitTime equals container end', () => {
      expect(service.isSplitTimeValid('16:00', '08:00', '16:00')).toBe(false);
    });

    it('returns false when splitTime is before container start', () => {
      expect(service.isSplitTimeValid('07:00', '08:00', '16:00')).toBe(false);
    });

    it('returns false when splitTime is after container end', () => {
      expect(service.isSplitTimeValid('17:00', '08:00', '16:00')).toBe(false);
    });
  });

  describe('categorizeItems — SubWorks', () => {
    it('places SubWork ending before splitTime in beforeWorks', () => {
      const result = service.categorizeItems(
        makeChildren([makeSubWork('1', '08:00', '10:00')], []),
        '12:00',
      );
      expect(result.beforeWorks).toHaveLength(1);
      expect(result.afterWorks).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('places SubWork ending exactly at splitTime in beforeWorks', () => {
      const result = service.categorizeItems(
        makeChildren([makeSubWork('1', '08:00', '12:00')], []),
        '12:00',
      );
      expect(result.beforeWorks).toHaveLength(1);
    });

    it('places SubWork starting at splitTime in afterWorks', () => {
      const result = service.categorizeItems(
        makeChildren([makeSubWork('1', '12:00', '14:00')], []),
        '12:00',
      );
      expect(result.afterWorks).toHaveLength(1);
      expect(result.beforeWorks).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('places SubWork starting after splitTime in afterWorks', () => {
      const result = service.categorizeItems(
        makeChildren([makeSubWork('1', '13:00', '15:00')], []),
        '12:00',
      );
      expect(result.afterWorks).toHaveLength(1);
    });

    it('marks SubWork spanning splitTime as conflict with null resolution', () => {
      const result = service.categorizeItems(
        makeChildren([makeSubWork('1', '10:00', '14:00')], []),
        '12:00',
      );
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].subWork.id).toBe('1');
      expect(result.conflicts[0].resolution).toBeNull();
    });
  });

  describe('categorizeItems — SubBreaks', () => {
    it('places SubBreak ending before splitTime in beforeBreaks', () => {
      const result = service.categorizeItems(
        makeChildren([], [makeSubBreak('1', '08:00', '10:00')]),
        '12:00',
      );
      expect(result.beforeBreaks).toHaveLength(1);
      expect(result.afterBreaks).toHaveLength(0);
    });

    it('places SubBreak starting at or after splitTime in afterBreaks', () => {
      const result = service.categorizeItems(
        makeChildren([], [makeSubBreak('1', '12:00', '14:00')]),
        '12:00',
      );
      expect(result.afterBreaks).toHaveLength(1);
      expect(result.beforeBreaks).toHaveLength(0);
    });

    it('auto-splits SubBreak spanning splitTime', () => {
      const result = service.categorizeItems(
        makeChildren([], [makeSubBreak('1', '11:00', '13:00')]),
        '12:00',
      );
      expect(result.beforeBreaks).toHaveLength(1);
      expect(result.afterBreaks).toHaveLength(1);
      expect(result.beforeBreaks[0].startTime).toBe('11:00');
      expect(result.beforeBreaks[0].endTime).toBe('12:00');
      expect(result.afterBreaks[0].startTime).toBe('12:00');
      expect(result.afterBreaks[0].endTime).toBe('13:00');
    });

    it('clears the id on the split after-part of a SubBreak', () => {
      const result = service.categorizeItems(
        makeChildren([], [makeSubBreak('1', '11:00', '13:00')]),
        '12:00',
      );
      expect(result.afterBreaks[0].id).toBe('');
    });
  });
});
