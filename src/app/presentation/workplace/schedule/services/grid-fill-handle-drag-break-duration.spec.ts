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
import { BreakCellParams } from 'src/app/domain/services/schedule/break-cell-params.interface';

const ABSENCE_ID = 'absence-1';
const CLIENT_ID = 'client-1';
const FIRST_DAY = new Date(2027, 0, 4);
const LAST_COLUMN = 2;
const NO_TIMES_RECORDED = '00:00:00';
const FULL_DAY_START = '00:00:00';
const FULL_DAY_END = '23:59:00';
const DURATION_MODE_HOURS = 4.5;
const FULL_DAY_SOURCE_HOURS = 8.4;

const dateForColumn = (col: number): Date =>
  new Date(FIRST_DAY.getFullYear(), FIRST_DAY.getMonth(), FIRST_DAY.getDate() + col);

describe('GridFillHandleDragService - fill handle carries the hours of a duration-mode absence', () => {
  let service: GridFillHandleDragService;
  let bulkAddBreaks: ReturnType<typeof vi.fn>;
  let sourceEntry: { startTime: string; endTime: string; changeTime: number | null };

  beforeEach(() => {
    bulkAddBreaks = vi.fn().mockResolvedValue(undefined);
    sourceEntry = { startTime: FULL_DAY_START, endTime: FULL_DAY_END, changeTime: FULL_DAY_SOURCE_HOURS };
    const dropResult = {
      startColumn: 0, endColumn: LAST_COLUMN, row: 0, entryId: ABSENCE_ID, workTime: 0,
      entryType: WorkScheduleEntryType.Break,
    };

    const gridData = {
      rowGroupIndex: [0],
      isColumnSealed: vi.fn().mockReturnValue(false),
      isCellActive: vi.fn().mockReturnValue(false),
      isCellOutsideMembershipPeriod: vi.fn().mockReturnValue(false),
      isCellOutsideGroupPeriod: vi.fn().mockReturnValue(false),
      getDateForColumn: vi.fn((col: number) => dateForColumn(col)),
      getWorkScheduleEntryForCell: vi.fn(() => sourceEntry),
    };

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
            shiftSchedules: [],
            clients: [{ id: CLIENT_ID }],
            bulkAddWorkScheduleEntries: vi.fn(),
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

  const filledBreaks = (): BreakCellParams[] => bulkAddBreaks.mock.calls[0][0] as BreakCellParams[];

  it('sends workTime 0 for a time-span absence so the backend recomputes the hours per day', async () => {
    await service.endDrag();

    const entries = filledBreaks();
    expect(entries).toHaveLength(LAST_COLUMN);
    expect(entries.map((entry) => entry.workTime)).toEqual([0, 0]);
    expect(entries.map((entry) => entry.startTime)).toEqual([FULL_DAY_START, FULL_DAY_START]);
    expect(entries.map((entry) => entry.endTime)).toEqual([FULL_DAY_END, FULL_DAY_END]);
  });

  it('carries the recorded hours of a duration-mode absence into every filled day', async () => {
    sourceEntry = { startTime: NO_TIMES_RECORDED, endTime: NO_TIMES_RECORDED, changeTime: DURATION_MODE_HOURS };

    await service.endDrag();

    const entries = filledBreaks();
    expect(entries.map((entry) => entry.workTime)).toEqual([DURATION_MODE_HOURS, DURATION_MODE_HOURS]);
    expect(entries.map((entry) => entry.startTime)).toEqual([NO_TIMES_RECORDED, NO_TIMES_RECORDED]);
    expect(entries.map((entry) => entry.endTime)).toEqual([NO_TIMES_RECORDED, NO_TIMES_RECORDED]);
  });

  it('sends workTime 0 for equal bounds without recorded hours', async () => {
    sourceEntry = { startTime: NO_TIMES_RECORDED, endTime: NO_TIMES_RECORDED, changeTime: null };

    await service.endDrag();

    expect(filledBreaks().map((entry) => entry.workTime)).toEqual([0, 0]);
  });
});
