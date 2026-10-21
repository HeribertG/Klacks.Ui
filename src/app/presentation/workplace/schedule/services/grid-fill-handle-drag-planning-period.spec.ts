// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GridFillHandleDragService } from './grid-fill-handle-drag.service';
import { FillHandleService } from './fill-handle.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { InputModalityService } from 'src/app/presentation/services/input-modality.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';

const SHIFT_ID = 'shift-1';
const ABSENCE_ID = 'absence-1';
const CLIENT_ID = 'client-1';
const FIRST_DAY = new Date(2027, 0, 4);
const LAST_COLUMN = 3;
const GROUP_PERIOD_ENDED_COLUMN = 2;
const MEMBERSHIP_ENDED_COLUMN = 3;

const dateForColumn = (col: number): Date =>
  new Date(FIRST_DAY.getFullYear(), FIRST_DAY.getMonth(), FIRST_DAY.getDate() + col);

describe('GridFillHandleDragService - fill handle respects the planning period', () => {
  let service: GridFillHandleDragService;
  let bulkAddWorks: ReturnType<typeof vi.fn>;
  let bulkAddBreaks: ReturnType<typeof vi.fn>;
  let dropResult: { startColumn: number; endColumn: number; row: number; entryId: string; workTime: number; entryType: number };

  beforeEach(() => {
    bulkAddWorks = vi.fn().mockResolvedValue(undefined);
    bulkAddBreaks = vi.fn().mockResolvedValue(undefined);
    dropResult = {
      startColumn: 0, endColumn: LAST_COLUMN, row: 0, entryId: SHIFT_ID, workTime: 8,
      entryType: WorkScheduleEntryType.Work,
    };

    const gridData = {
      rowGroupIndex: [0],
      isColumnSealed: vi.fn().mockReturnValue(false),
      isCellActive: vi.fn().mockReturnValue(false),
      isCellOutsideMembershipPeriod: vi.fn((_row: number, col: number) => col === MEMBERSHIP_ENDED_COLUMN),
      isCellOutsideGroupPeriod: vi.fn((_row: number, col: number) => col === GROUP_PERIOD_ENDED_COLUMN),
      getDateForColumn: vi.fn((col: number) => dateForColumn(col)),
      getWorkScheduleEntryForCell: vi.fn().mockReturnValue({ startTime: '08:00', endTime: '16:00' }),
    };
    const shiftSchedules = [0, 1, 2, 3].map((col) => ({
      shiftId: SHIFT_ID, date: dateForColumn(col), sumEmployees: 1, quantity: 1, engaged: 0,
      startShift: '08:00', endShift: '16:00',
    }));

    TestBed.configureTestingModule({
      providers: [
        GridFillHandleDragService,
        { provide: BaseDataService, useValue: gridData },
        { provide: BaseSettingsService, useValue: { cellWidth: 90, cellHeight: 30, cellHeaderHeight: 0, zoom: 1 } },
        { provide: ScrollService, useValue: { horizontalScrollPosition: 0, verticalScrollPosition: 0 } },
        { provide: BaseCellManipulationService, useValue: {} },
        { provide: FillHandleService, useValue: { endDrag: () => dropResult, isDragging: vi.fn().mockReturnValue(false) } },
        { provide: GridFontsService, useValue: {} },
        {
          provide: DataManagementScheduleService,
          useValue: {
            shiftSchedules,
            clients: [{ id: CLIENT_ID }],
            bulkAddWorkScheduleEntries: bulkAddWorks,
            bulkAddBreakScheduleEntries: bulkAddBreaks,
          },
        },
        { provide: InputModalityService, useValue: { isTouchMode: () => false } },
      ],
    });

    service = TestBed.inject(GridFillHandleDragService);
    service.initialize({
      gridSurface: { drawSchedule: { refresh: vi.fn() } } as any,
      el: new ElementRef(document.createElement('canvas')) as ElementRef<HTMLCanvasElement>,
    });
  });

  it('fills a work only into the days inside the membership and the group period', async () => {
    await service.endDrag();

    const entries = bulkAddWorks.mock.calls[0][0] as { date: Date }[];
    expect(entries.map((entry) => entry.date)).toEqual([dateForColumn(1)]);
  });

  it('fills an absence only into the days inside the membership and the group period', async () => {
    dropResult = { ...dropResult, entryId: ABSENCE_ID, entryType: WorkScheduleEntryType.Break };

    await service.endDrag();

    const entries = bulkAddBreaks.mock.calls[0][0] as { date: Date }[];
    expect(entries.map((entry) => entry.date)).toEqual([dateForColumn(1)]);
  });
});
