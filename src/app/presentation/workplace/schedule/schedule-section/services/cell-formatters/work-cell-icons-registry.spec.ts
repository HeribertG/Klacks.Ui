// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { WorkLockLevel } from 'src/app/domain/enums/work-lock-level.enum';
import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { CellIconsService } from 'src/app/presentation/shared/grid/services/body/cell-icons.service';
import { EmptyCellFormatterService } from './empty-cell-formatter.service';
import { WorkCellFormatterService } from './work-cell-formatter.service';

/**
 * The canvas draws a cell icon only when CellIconsService knows its name; an unknown name is skipped without any
 * error. Pins that every icon the work formatter emits (lock levels and the cover-move marker) is registered.
 */
function workEntry(overrides: Partial<IScheduleCell>): IScheduleCell {
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

describe('work cell icons are registered for the canvas', () => {
  let formatter: WorkCellFormatterService;
  let cellIcons: CellIconsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorkCellFormatterService,
        EmptyCellFormatterService,
        CellIconsService,
        { provide: GridColorService, useValue: { mainFontColor: '#000000' } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: DataManagementScheduleService, useValue: { clients: [] } },
      ],
    });
    formatter = TestBed.inject(WorkCellFormatterService);
    cellIcons = TestBed.inject(CellIconsService);
  });

  it.each([
    ['confirmed', { lockLevel: WorkLockLevel.Confirmed }],
    ['approved', { lockLevel: WorkLockLevel.Approved }],
    ['closed', { lockLevel: WorkLockLevel.Closed }],
    ['moved', { movedFromClientId: 'origin-1' }],
  ])('draws the %s icon', (_name, overrides: Partial<IScheduleCell>) => {
    const cell = formatter.formatCell(workEntry(overrides));

    expect(cell.icons?.length).toBe(1);
    for (const icon of cell.icons ?? []) {
      expect(cellIcons.getIcon(icon.svgIcon)).toBeDefined();
    }
  });

  it('draws both icons of a moved and closed work', () => {
    const cell = formatter.formatCell(workEntry({ lockLevel: WorkLockLevel.Closed, movedFromClientId: 'origin-1' }));

    expect(cell.icons?.map((icon) => cellIcons.getIcon(icon.svgIcon) !== undefined)).toEqual([true, true]);
  });
});
