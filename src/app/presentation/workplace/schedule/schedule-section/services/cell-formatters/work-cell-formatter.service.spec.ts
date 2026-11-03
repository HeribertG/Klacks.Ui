// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkCellFormatterService } from './work-cell-formatter.service';
import { EmptyCellFormatterService } from './empty-cell-formatter.service';
import { WorkLockLevel } from 'src/app/domain/enums/work-lock-level.enum';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';

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
      providers: [
        WorkCellFormatterService,
        EmptyCellFormatterService,
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
          },
        },
        { provide: DataManagementScheduleService, useValue: { clients: [{ id: 'origin-1', firstName: 'Elsa', name: 'Meier' }] } },
      ],
    });
    service = TestBed.inject(WorkCellFormatterService);
  });

  describe('moved service', () => {
    it('names the person the service was taken over from and marks the cell', () => {
      const cell = service.formatCell(createEntry({ movedFromClientId: 'origin-1' }));

      expect(cell.tooltip).toContain('schedule.moved-from');
      expect(cell.tooltip).toContain('Elsa Meier');
      expect(cell.icons?.length).toBe(1);
    });

    it('says only that it was taken over when the person is not visible', () => {
      const cell = service.formatCell(createEntry({ movedFromClientId: 'hidden-1' }));

      expect(cell.tooltip).toBe('schedule.moved-from-hidden');
    });

    it('keeps the lock text next to the note', () => {
      const cell = service.formatCell(createEntry({ movedFromClientId: 'origin-1', lockLevel: WorkLockLevel.Confirmed }));

      expect(cell.tooltip).toContain('lockLevel.confirmed');
      expect(cell.tooltip).toContain('Elsa Meier');
    });

    it('adds nothing to a service that was not moved', () => {
      const cell = service.formatCell(createEntry());

      expect(cell.tooltip).toBe('');
    });
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

    it('should set sealed to true when isGroupRestricted is true', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.None, isGroupRestricted: true });

      // Act
      const cell = service.formatCell(entry);

      // Assert
      expect(cell.sealed).toBe(true);
    });

    it('should set sealed to true when both lockLevel > 0 and isGroupRestricted', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Confirmed, isGroupRestricted: true });

      // Act
      const cell = service.formatCell(entry);

      // Assert
      expect(cell.sealed).toBe(true);
    });
  });
});
