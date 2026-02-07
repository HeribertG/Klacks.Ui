import { describe, it, expect, beforeEach } from 'vitest';
import {
  FillHandleCopyService,
  FillHandleDropResult,
  ColumnContext,
} from './fill-handle-copy.service';
import { IScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { ShiftSporadic } from 'src/app/domain/enums/shift-sporadic.enum';

function createMockShiftSchedule(overrides: Partial<IShiftSchedule> = {}): IShiftSchedule {
  return {
    shiftId: 'shift-1',
    date: new Date('2025-01-15'),
    dayOfWeek: 3,
    shiftName: 'Test Shift',
    abbreviation: 'TS',
    startShift: '08:00',
    endShift: '16:00',
    workTime: 480,
    isSporadic: false,
    isTimeRange: false,
    shiftType: 0,
    isInTemplateContainer: false,
    sumEmployees: 10,
    quantity: 1,
    sporadicScope: ShiftSporadic.Week,
    engaged: 2,
    ...overrides,
  };
}

function createMockSourceEntry(overrides: Partial<IScheduleCell> = {}): IScheduleCell {
  return {
    id: 'entry-1',
    entryType: WorkScheduleEntryType.Work,
    sourceId: 'source-1',
    clientId: 'client-1',
    entryDate: new Date('2025-01-15'),
    startTime: '09:00',
    endTime: '17:00',
    changeTime: null,
    surcharges: null,
    workChangeType: null,
    description: null,
    information: 'Test info',
    amount: null,
    toInvoice: null,
    taxable: null,
    entryId: 'shift-1',
    entryName: 'Test Shift',
    abbreviation: 'TS',
    replaceClientId: null,
    isReplacementEntry: false,
    ...overrides,
  };
}

function createColumnContext(column: number, date: Date, clientId: string, overrides: Partial<ColumnContext> = {}): ColumnContext {
  return {
    column,
    date,
    isLocked: false,
    isCellActive: false,
    clientId,
    ...overrides,
  };
}

describe('FillHandleCopyService', () => {
  let service: FillHandleCopyService;

  beforeEach(() => {
    service = new FillHandleCopyService();
  });

  describe('buildWorkEntriesToCopy', () => {
    describe('basic copy behavior', () => {
      it('should copy work entries with source entry times', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'shift-1',
          workTime: 480,
          entryType: WorkScheduleEntryType.Work,
        };
        const sourceEntry = createMockSourceEntry({
          startTime: '09:00',
          endTime: '17:00',
          information: 'Custom info',
        });
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];
        const shiftSchedules = [
          createMockShiftSchedule({ date: new Date('2025-01-16') }),
          createMockShiftSchedule({ date: new Date('2025-01-17') }),
        ];

        // Act
        const entries = service.buildWorkEntriesToCopy(result, sourceEntry, columnContexts, shiftSchedules);

        // Assert
        expect(entries).toHaveLength(2);
        expect(entries[0].startTime).toBe('09:00');
        expect(entries[0].endTime).toBe('17:00');
        expect(entries[0].information).toBe('Custom info');
        expect(entries[1].startTime).toBe('09:00');
        expect(entries[1].endTime).toBe('17:00');
        expect(entries[1].information).toBe('Custom info');
      });

      it('should use shift times when sourceEntry is undefined', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 1,
          row: 0,
          entryId: 'shift-1',
          workTime: 480,
          entryType: WorkScheduleEntryType.Work,
        };
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
        ];
        const shiftSchedules = [
          createMockShiftSchedule({
            date: new Date('2025-01-16'),
            startShift: '08:00',
            endShift: '16:00',
          }),
        ];

        // Act
        const entries = service.buildWorkEntriesToCopy(result, undefined, columnContexts, shiftSchedules);

        // Assert
        expect(entries).toHaveLength(1);
        expect(entries[0].startTime).toBe('08:00');
        expect(entries[0].endTime).toBe('16:00');
        expect(entries[0].information).toBeUndefined();
      });

      it('should use shift times when sourceEntry times are null', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 1,
          row: 0,
          entryId: 'shift-1',
          workTime: 480,
          entryType: WorkScheduleEntryType.Work,
        };
        const sourceEntry = createMockSourceEntry({
          startTime: '',
          endTime: '',
        });
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
        ];
        const shiftSchedules = [
          createMockShiftSchedule({
            date: new Date('2025-01-16'),
            startShift: '08:00',
            endShift: '16:00',
          }),
        ];

        // Act
        const entries = service.buildWorkEntriesToCopy(result, sourceEntry, columnContexts, shiftSchedules);

        // Assert
        expect(entries).toHaveLength(1);
        expect(entries[0].startTime).toBe('08:00');
        expect(entries[0].endTime).toBe('16:00');
      });
    });

    describe('skip conditions', () => {
      it('should skip sealed columns', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'shift-1',
          workTime: 480,
          entryType: WorkScheduleEntryType.Work,
        };
        const sourceEntry = createMockSourceEntry();
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1', { isLocked: true }),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];
        const shiftSchedules = [
          createMockShiftSchedule({ date: new Date('2025-01-16') }),
          createMockShiftSchedule({ date: new Date('2025-01-17') }),
        ];

        // Act
        const entries = service.buildWorkEntriesToCopy(result, sourceEntry, columnContexts, shiftSchedules);

        // Assert
        expect(entries).toHaveLength(1);
        expect(entries[0].date).toEqual(new Date('2025-01-17'));
      });

      it('should skip active cells', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'shift-1',
          workTime: 480,
          entryType: WorkScheduleEntryType.Work,
        };
        const sourceEntry = createMockSourceEntry();
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1', { isCellActive: true }),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];
        const shiftSchedules = [
          createMockShiftSchedule({ date: new Date('2025-01-16') }),
          createMockShiftSchedule({ date: new Date('2025-01-17') }),
        ];

        // Act
        const entries = service.buildWorkEntriesToCopy(result, sourceEntry, columnContexts, shiftSchedules);

        // Assert
        expect(entries).toHaveLength(1);
        expect(entries[0].date).toEqual(new Date('2025-01-17'));
      });

      it('should skip columns without date', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'shift-1',
          workTime: 480,
          entryType: WorkScheduleEntryType.Work,
        };
        const sourceEntry = createMockSourceEntry();
        const columnContexts = [
          createColumnContext(1, undefined as unknown as Date, 'client-1'),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];
        const shiftSchedules = [
          createMockShiftSchedule({ date: new Date('2025-01-17') }),
        ];

        // Act
        const entries = service.buildWorkEntriesToCopy(result, sourceEntry, columnContexts, shiftSchedules);

        // Assert
        expect(entries).toHaveLength(1);
      });

      it('should skip columns without available shift', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'shift-1',
          workTime: 480,
          entryType: WorkScheduleEntryType.Work,
        };
        const sourceEntry = createMockSourceEntry();
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];
        const shiftSchedules = [
          createMockShiftSchedule({ date: new Date('2025-01-17') }),
        ];

        // Act
        const entries = service.buildWorkEntriesToCopy(result, sourceEntry, columnContexts, shiftSchedules);

        // Assert
        expect(entries).toHaveLength(1);
        expect(entries[0].date).toEqual(new Date('2025-01-17'));
      });

      it('should skip columns where shift is at capacity', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'shift-1',
          workTime: 480,
          entryType: WorkScheduleEntryType.Work,
        };
        const sourceEntry = createMockSourceEntry();
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];
        const shiftSchedules = [
          createMockShiftSchedule({
            date: new Date('2025-01-16'),
            sumEmployees: 2,
            quantity: 1,
            engaged: 2,
          }),
          createMockShiftSchedule({ date: new Date('2025-01-17') }),
        ];

        // Act
        const entries = service.buildWorkEntriesToCopy(result, sourceEntry, columnContexts, shiftSchedules);

        // Assert
        expect(entries).toHaveLength(1);
        expect(entries[0].date).toEqual(new Date('2025-01-17'));
      });

      it('should skip columns without clientId', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'shift-1',
          workTime: 480,
          entryType: WorkScheduleEntryType.Work,
        };
        const sourceEntry = createMockSourceEntry();
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), undefined as unknown as string),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];
        const shiftSchedules = [
          createMockShiftSchedule({ date: new Date('2025-01-16') }),
          createMockShiftSchedule({ date: new Date('2025-01-17') }),
        ];

        // Act
        const entries = service.buildWorkEntriesToCopy(result, sourceEntry, columnContexts, shiftSchedules);

        // Assert
        expect(entries).toHaveLength(1);
        expect(entries[0].date).toEqual(new Date('2025-01-17'));
      });
    });

    describe('capacity calculation', () => {
      it('should allow copy when engaged is less than capacity', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 1,
          row: 0,
          entryId: 'shift-1',
          workTime: 480,
          entryType: WorkScheduleEntryType.Work,
        };
        const sourceEntry = createMockSourceEntry();
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
        ];
        const shiftSchedules = [
          createMockShiftSchedule({
            date: new Date('2025-01-16'),
            sumEmployees: 5,
            quantity: 2,
            engaged: 9,
          }),
        ];

        // Act
        const entries = service.buildWorkEntriesToCopy(result, sourceEntry, columnContexts, shiftSchedules);

        // Assert
        expect(entries).toHaveLength(1);
      });

      it('should reject copy when engaged equals capacity', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 1,
          row: 0,
          entryId: 'shift-1',
          workTime: 480,
          entryType: WorkScheduleEntryType.Work,
        };
        const sourceEntry = createMockSourceEntry();
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
        ];
        const shiftSchedules = [
          createMockShiftSchedule({
            date: new Date('2025-01-16'),
            sumEmployees: 5,
            quantity: 2,
            engaged: 10,
          }),
        ];

        // Act
        const entries = service.buildWorkEntriesToCopy(result, sourceEntry, columnContexts, shiftSchedules);

        // Assert
        expect(entries).toHaveLength(0);
      });
    });
  });

  describe('buildBreakEntriesToCopy', () => {
    describe('basic copy behavior', () => {
      it('should copy break entries with source entry times', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'absence-1',
          workTime: 0,
          entryType: WorkScheduleEntryType.Break,
        };
        const sourceEntry = createMockSourceEntry({
          entryType: WorkScheduleEntryType.Break,
          startTime: '12:00',
          endTime: '13:00',
          description: { de: 'Mittagspause', en: 'Lunch break' },
        });
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];

        // Act
        const entries = service.buildBreakEntriesToCopy(result, sourceEntry, columnContexts);

        // Assert
        expect(entries).toHaveLength(2);
        expect(entries[0].startTime).toBe('12:00');
        expect(entries[0].endTime).toBe('13:00');
        expect(entries[0].absenceId).toBe('absence-1');
        expect(entries[0].description).toBe('Mittagspause');
      });

      it('should return empty array when sourceEntry is undefined', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'absence-1',
          workTime: 0,
          entryType: WorkScheduleEntryType.Break,
        };
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
        ];

        // Act
        const entries = service.buildBreakEntriesToCopy(result, undefined, columnContexts);

        // Assert
        expect(entries).toHaveLength(0);
      });

      it('should use default times when sourceEntry times are empty', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 1,
          row: 0,
          entryId: 'absence-1',
          workTime: 0,
          entryType: WorkScheduleEntryType.Break,
        };
        const sourceEntry = createMockSourceEntry({
          entryType: WorkScheduleEntryType.Break,
          startTime: '',
          endTime: '',
        });
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
        ];

        // Act
        const entries = service.buildBreakEntriesToCopy(result, sourceEntry, columnContexts);

        // Assert
        expect(entries).toHaveLength(1);
        expect(entries[0].startTime).toBe('00:00');
        expect(entries[0].endTime).toBe('00:00');
      });
    });

    describe('skip conditions', () => {
      it('should skip sealed columns', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'absence-1',
          workTime: 0,
          entryType: WorkScheduleEntryType.Break,
        };
        const sourceEntry = createMockSourceEntry({
          entryType: WorkScheduleEntryType.Break,
        });
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1', { isLocked: true }),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];

        // Act
        const entries = service.buildBreakEntriesToCopy(result, sourceEntry, columnContexts);

        // Assert
        expect(entries).toHaveLength(1);
        expect(entries[0].date).toEqual(new Date('2025-01-17'));
      });

      it('should skip active cells', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'absence-1',
          workTime: 0,
          entryType: WorkScheduleEntryType.Break,
        };
        const sourceEntry = createMockSourceEntry({
          entryType: WorkScheduleEntryType.Break,
        });
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1', { isCellActive: true }),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];

        // Act
        const entries = service.buildBreakEntriesToCopy(result, sourceEntry, columnContexts);

        // Assert
        expect(entries).toHaveLength(1);
        expect(entries[0].date).toEqual(new Date('2025-01-17'));
      });

      it('should skip columns without date', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'absence-1',
          workTime: 0,
          entryType: WorkScheduleEntryType.Break,
        };
        const sourceEntry = createMockSourceEntry({
          entryType: WorkScheduleEntryType.Break,
        });
        const columnContexts = [
          createColumnContext(1, undefined as unknown as Date, 'client-1'),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];

        // Act
        const entries = service.buildBreakEntriesToCopy(result, sourceEntry, columnContexts);

        // Assert
        expect(entries).toHaveLength(1);
      });

      it('should skip columns without clientId', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 2,
          row: 0,
          entryId: 'absence-1',
          workTime: 0,
          entryType: WorkScheduleEntryType.Break,
        };
        const sourceEntry = createMockSourceEntry({
          entryType: WorkScheduleEntryType.Break,
        });
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), undefined as unknown as string),
          createColumnContext(2, new Date('2025-01-17'), 'client-1'),
        ];

        // Act
        const entries = service.buildBreakEntriesToCopy(result, sourceEntry, columnContexts);

        // Assert
        expect(entries).toHaveLength(1);
        expect(entries[0].date).toEqual(new Date('2025-01-17'));
      });
    });

    describe('description handling', () => {
      it('should use de description as primary', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 1,
          row: 0,
          entryId: 'absence-1',
          workTime: 0,
          entryType: WorkScheduleEntryType.Break,
        };
        const sourceEntry = createMockSourceEntry({
          entryType: WorkScheduleEntryType.Break,
          description: { de: 'German', en: 'English' },
        });
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
        ];

        // Act
        const entries = service.buildBreakEntriesToCopy(result, sourceEntry, columnContexts);

        // Assert
        expect(entries[0].description).toBe('German');
      });

      it('should fallback to en description when de is missing', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 1,
          row: 0,
          entryId: 'absence-1',
          workTime: 0,
          entryType: WorkScheduleEntryType.Break,
        };
        const sourceEntry = createMockSourceEntry({
          entryType: WorkScheduleEntryType.Break,
          description: { en: 'English' },
        });
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
        ];

        // Act
        const entries = service.buildBreakEntriesToCopy(result, sourceEntry, columnContexts);

        // Assert
        expect(entries[0].description).toBe('English');
      });

      it('should return undefined when no description', () => {
        // Arrange
        const result: FillHandleDropResult = {
          startColumn: 0,
          endColumn: 1,
          row: 0,
          entryId: 'absence-1',
          workTime: 0,
          entryType: WorkScheduleEntryType.Break,
        };
        const sourceEntry = createMockSourceEntry({
          entryType: WorkScheduleEntryType.Break,
          description: null,
        });
        const columnContexts = [
          createColumnContext(1, new Date('2025-01-16'), 'client-1'),
        ];

        // Act
        const entries = service.buildBreakEntriesToCopy(result, sourceEntry, columnContexts);

        // Assert
        expect(entries[0].description).toBeUndefined();
      });
    });
  });
});
