// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for midnight-crossing TimeBlock conversion and placement in container templates.
 * @param convertAbsencesToTimeBlocks - Converts absence items to ITimeBlock[] with midnight-safe duration
 * @param applyPlacedTimeBlocks - Inserts placed absence items at optimized positions
 */
import { describe, it, expect } from 'vitest';
import { timeToMinutes } from 'src/app/shared/helpers/time-format.helper';
import {
  IContainerTemplateItem,
} from 'src/app/domain/models/container/container-template-class';
import {
  ITimeBlock,
  ITimeBlockResult,
} from 'src/app/domain/services/route-optimization.service';

function convertAbsencesToTimeBlocks(
  absenceItems: IContainerTemplateItem[],
): ITimeBlock[] {
  return absenceItems
    .filter((item) => !!item.absenceId)
    .map((item) => {
      const hasFixedTime = !!item.startItem && !!item.endItem;
      const minutesPerDay = 1440;
      let durationMinutes = hasFixedTime
        ? timeToMinutes(item.endItem!) - timeToMinutes(item.startItem!)
        : timeToMinutes(item.timeRangeEndItem || '00:30:00') -
          timeToMinutes(item.timeRangeStartItem || '00:00:00');
      if (durationMinutes < 0) {
        durationMinutes += minutesPerDay;
      }

      return {
        id: item.absenceId!,
        fixedStartTime: hasFixedTime ? item.startItem : undefined,
        fixedEndTime: hasFixedTime ? item.endItem : undefined,
        durationMinutes: Math.max(durationMinutes, 1),
        isMovable: !hasFixedTime,
      } as ITimeBlock;
    });
}

function applyPlacedTimeBlocks(
  placedBlocks: ITimeBlockResult[] | undefined,
  absenceItems: IContainerTemplateItem[],
  reorderedShiftItems: IContainerTemplateItem[],
): IContainerTemplateItem[] {
  if (!placedBlocks || placedBlocks.length === 0) {
    return [...reorderedShiftItems, ...absenceItems];
  }

  const result: IContainerTemplateItem[] = [...reorderedShiftItems];

  for (const block of placedBlocks) {
    const absenceItem = absenceItems.find(
      (item) => item.absenceId === block.id,
    );
    if (absenceItem) {
      const updatedItem: IContainerTemplateItem = {
        ...absenceItem,
        startItem: block.startTime,
        endItem: block.endTime,
        timeRangeStartItem: block.startTime,
        timeRangeEndItem: block.endTime,
      };

      const insertIdx = Math.min(block.insertionPosition, result.length);
      result.splice(insertIdx, 0, updatedItem);
    }
  }

  return result;
}

function createAbsenceItem(overrides: Partial<IContainerTemplateItem> = {}): IContainerTemplateItem {
  return {
    absenceId: 'absence-1',
    briefingTime: '00:00:00',
    debriefingTime: '00:00:00',
    travelTimeAfter: '00:00:00',
    travelTimeBefore: '00:00:00',
    timeRangeStartItem: '00:00:00',
    timeRangeEndItem: '00:30:00',
    absence: { name: 'Lunch Break' } as unknown as IContainerTemplateItem['absence'],
    ...overrides,
  } as IContainerTemplateItem;
}

function createShiftItem(id: string): IContainerTemplateItem {
  return {
    shiftId: id,
    briefingTime: '00:05:00',
    debriefingTime: '00:05:00',
    travelTimeAfter: '00:00:00',
    travelTimeBefore: '00:00:00',
    timeRangeStartItem: '08:00:00',
    timeRangeEndItem: '12:00:00',
  } as IContainerTemplateItem;
}

describe('convertAbsencesToTimeBlocks', () => {
  it('should calculate correct duration for normal time range', () => {
    const item = createAbsenceItem({
      startItem: '12:00:00',
      endItem: '13:00:00',
    });

    const result = convertAbsencesToTimeBlocks([item]);

    expect(result).toHaveLength(1);
    expect(result[0].durationMinutes).toBe(60);
    expect(result[0].isMovable).toBe(false);
    expect(result[0].fixedStartTime).toBe('12:00:00');
    expect(result[0].fixedEndTime).toBe('13:00:00');
  });

  it('should handle midnight-crossing fixed times (23:00 - 01:00 = 120 min)', () => {
    const item = createAbsenceItem({
      startItem: '23:00:00',
      endItem: '01:00:00',
    });

    const result = convertAbsencesToTimeBlocks([item]);

    expect(result).toHaveLength(1);
    expect(result[0].durationMinutes).toBe(120);
    expect(result[0].isMovable).toBe(false);
  });

  it('should handle midnight-crossing fixed times (23:30 - 00:30 = 60 min)', () => {
    const item = createAbsenceItem({
      startItem: '23:30:00',
      endItem: '00:30:00',
    });

    const result = convertAbsencesToTimeBlocks([item]);

    expect(result[0].durationMinutes).toBe(60);
  });

  it('should handle midnight-crossing time ranges for movable blocks', () => {
    const item = createAbsenceItem({
      startItem: undefined,
      endItem: undefined,
      timeRangeStartItem: '23:00:00',
      timeRangeEndItem: '01:00:00',
    });

    const result = convertAbsencesToTimeBlocks([item]);

    expect(result).toHaveLength(1);
    expect(result[0].durationMinutes).toBe(120);
    expect(result[0].isMovable).toBe(true);
    expect(result[0].fixedStartTime).toBeUndefined();
  });

  it('should return movable block when no fixed times', () => {
    const item = createAbsenceItem({
      startItem: undefined,
      endItem: undefined,
      timeRangeStartItem: '12:00:00',
      timeRangeEndItem: '12:30:00',
    });

    const result = convertAbsencesToTimeBlocks([item]);

    expect(result[0].isMovable).toBe(true);
    expect(result[0].durationMinutes).toBe(30);
  });

  it('should filter out items without absenceId', () => {
    const shiftItem = createShiftItem('shift-1');

    const result = convertAbsencesToTimeBlocks([shiftItem]);

    expect(result).toHaveLength(0);
  });

  it('should ensure minimum duration of 1 minute', () => {
    const item = createAbsenceItem({
      startItem: '12:00:00',
      endItem: '12:00:00',
    });

    const result = convertAbsencesToTimeBlocks([item]);

    expect(result[0].durationMinutes).toBe(1);
  });

  it('should handle multiple absences with mixed normal and midnight times', () => {
    const normalItem = createAbsenceItem({
      absenceId: 'abs-1',
      startItem: '12:00:00',
      endItem: '13:00:00',
    });
    const midnightItem = createAbsenceItem({
      absenceId: 'abs-2',
      startItem: '23:00:00',
      endItem: '00:30:00',
    });

    const result = convertAbsencesToTimeBlocks([normalItem, midnightItem]);

    expect(result).toHaveLength(2);
    expect(result[0].durationMinutes).toBe(60);
    expect(result[1].durationMinutes).toBe(90);
  });
});

describe('applyPlacedTimeBlocks', () => {
  it('should append absences when no placed blocks', () => {
    const shifts = [createShiftItem('s1'), createShiftItem('s2')];
    const absences = [createAbsenceItem({ absenceId: 'a1' })];

    const result = applyPlacedTimeBlocks(undefined, absences, shifts);

    expect(result).toHaveLength(3);
    expect(result[0].shiftId).toBe('s1');
    expect(result[1].shiftId).toBe('s2');
    expect(result[2].absenceId).toBe('a1');
  });

  it('should insert absence at correct position from placed blocks', () => {
    const shifts = [createShiftItem('s1'), createShiftItem('s2'), createShiftItem('s3')];
    const absences = [createAbsenceItem({ absenceId: 'a1' })];
    const placed: ITimeBlockResult[] = [{
      id: 'a1',
      startTime: '12:00:00',
      endTime: '13:00:00',
      insertionPosition: 1,
      isMovable: false,
    }];

    const result = applyPlacedTimeBlocks(placed, absences, shifts);

    expect(result).toHaveLength(4);
    expect(result[0].shiftId).toBe('s1');
    expect(result[1].absenceId).toBe('a1');
    expect(result[1].startItem).toBe('12:00:00');
    expect(result[1].endItem).toBe('13:00:00');
    expect(result[2].shiftId).toBe('s2');
    expect(result[3].shiftId).toBe('s3');
  });

  it('should update time fields on inserted absence items', () => {
    const shifts = [createShiftItem('s1')];
    const absences = [createAbsenceItem({ absenceId: 'a1' })];
    const placed: ITimeBlockResult[] = [{
      id: 'a1',
      startTime: '23:30:00',
      endTime: '00:30:00',
      insertionPosition: 0,
      isMovable: false,
    }];

    const result = applyPlacedTimeBlocks(placed, absences, shifts);

    expect(result).toHaveLength(2);
    expect(result[0].absenceId).toBe('a1');
    expect(result[0].startItem).toBe('23:30:00');
    expect(result[0].endItem).toBe('00:30:00');
    expect(result[0].timeRangeStartItem).toBe('23:30:00');
    expect(result[0].timeRangeEndItem).toBe('00:30:00');
  });

  it('should handle insertion position beyond array length', () => {
    const shifts = [createShiftItem('s1')];
    const absences = [createAbsenceItem({ absenceId: 'a1' })];
    const placed: ITimeBlockResult[] = [{
      id: 'a1',
      startTime: '12:00:00',
      endTime: '13:00:00',
      insertionPosition: 99,
      isMovable: false,
    }];

    const result = applyPlacedTimeBlocks(placed, absences, shifts);

    expect(result).toHaveLength(2);
    expect(result[1].absenceId).toBe('a1');
  });

  it('should handle multiple placed blocks at different positions', () => {
    const shifts = [createShiftItem('s1'), createShiftItem('s2'), createShiftItem('s3')];
    const absences = [
      createAbsenceItem({ absenceId: 'a1' }),
      createAbsenceItem({ absenceId: 'a2' }),
    ];
    const placed: ITimeBlockResult[] = [
      { id: 'a1', startTime: '10:00:00', endTime: '10:30:00', insertionPosition: 1, isMovable: false },
      { id: 'a2', startTime: '14:00:00', endTime: '14:30:00', insertionPosition: 3, isMovable: false },
    ];

    const result = applyPlacedTimeBlocks(placed, absences, shifts);

    expect(result).toHaveLength(5);
    expect(result[0].shiftId).toBe('s1');
    expect(result[1].absenceId).toBe('a1');
    expect(result[2].shiftId).toBe('s2');
    expect(result[3].absenceId).toBe('a2');
    expect(result[4].shiftId).toBe('s3');
  });

  it('should return empty array with shifts only when placed blocks is empty array', () => {
    const shifts = [createShiftItem('s1')];
    const absences = [createAbsenceItem({ absenceId: 'a1' })];

    const result = applyPlacedTimeBlocks([], absences, shifts);

    expect(result).toHaveLength(2);
    expect(result[0].shiftId).toBe('s1');
    expect(result[1].absenceId).toBe('a1');
  });
});
