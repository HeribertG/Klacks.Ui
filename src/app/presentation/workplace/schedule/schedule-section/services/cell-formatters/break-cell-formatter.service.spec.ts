import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { BreakCellFormatterService } from './break-cell-formatter.service';
import { EmptyCellFormatterService } from './empty-cell-formatter.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { WorkLockLevel } from 'src/app/domain/enums/work-lock-level.enum';
import { IScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/work-schedule-class';
import { TranslateModule } from '@ngx-translate/core';
import { vi } from 'vitest';

function createEntry(overrides: Partial<IScheduleCell> = {}): IScheduleCell {
  return {
    id: 'entry-1',
    entryType: WorkScheduleEntryType.Break,
    sourceId: 'source-1',
    clientId: 'client-1',
    entryDate: new Date('2025-01-15'),
    startTime: '12:00',
    endTime: '12:30',
    changeTime: null,
    surcharges: null,
    workChangeType: null,
    description: null,
    information: null,
    amount: null,
    toInvoice: null,
    taxable: null,
    entryId: 'absence-1',
    entryName: 'Lunch Break',
    abbreviation: 'LB',
    replaceClientId: null,
    isReplacementEntry: false,
    lockLevel: WorkLockLevel.None,
    isGroupRestricted: false,
    ...overrides,
  };
}

describe('BreakCellFormatterService', () => {
  let service: BreakCellFormatterService;

  beforeEach(() => {
    const absenceLookupMock = {
      getAbbreviationForEntryId: vi.fn().mockReturnValue('LB'),
      getColorForEntryId: vi.fn().mockReturnValue(null),
      getNameForEntryId: vi.fn().mockReturnValue('Lunch Break'),
    };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        BreakCellFormatterService,
        EmptyCellFormatterService,
        { provide: AbsenceLookupService, useValue: absenceLookupMock },
      ],
    });
    service = TestBed.inject(BreakCellFormatterService);
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
