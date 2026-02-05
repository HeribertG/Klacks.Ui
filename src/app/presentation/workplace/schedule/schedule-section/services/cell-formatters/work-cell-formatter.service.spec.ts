import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkCellFormatterService } from './work-cell-formatter.service';
import { EmptyCellFormatterService } from './empty-cell-formatter.service';
import { WorkLockLevel } from 'src/app/domain/enums/work-lock-level.enum';
import { IScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/work-schedule-class';

function createEntry(overrides: Partial<IScheduleCell> = {}): IScheduleCell {
  return {
    id: 'entry-1',
    entryType: WorkScheduleEntryType.Work,
    sourceId: 'source-1',
    clientId: 'client-1',
    entryDate: new Date('2025-01-15'),
    startTime: '08:00',
    endTime: '16:00',
    changeTime: null,
    surcharges: null,
    workChangeType: null,
    description: null,
    information: null,
    amount: null,
    toInvoice: null,
    taxable: null,
    entryId: 'shift-1',
    entryName: 'Test Shift',
    abbreviation: 'TS',
    replaceClientId: null,
    isReplacementEntry: false,
    lockLevel: WorkLockLevel.None,
    isGroupRestricted: false,
    ...overrides,
  };
}

describe('WorkCellFormatterService', () => {
  let service: WorkCellFormatterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WorkCellFormatterService, EmptyCellFormatterService],
    });
    service = TestBed.inject(WorkCellFormatterService);
  });

  describe('sealed flag', () => {
    it('should set sealed to false when lockLevel is None', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.None });

      // Act
      const cell = service.formatCell(entry);

      // Assert
      expect(cell.sealed).toBe(false);
    });

    it('should set sealed to true when lockLevel is Confirmed', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Confirmed });

      // Act
      const cell = service.formatCell(entry);

      // Assert
      expect(cell.sealed).toBe(true);
    });

    it('should set sealed to true when lockLevel is Approved', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Approved });

      // Act
      const cell = service.formatCell(entry);

      // Assert
      expect(cell.sealed).toBe(true);
    });

    it('should set sealed to true when lockLevel is Closed', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Closed });

      // Act
      const cell = service.formatCell(entry);

      // Assert
      expect(cell.sealed).toBe(true);
    });
  });
});
