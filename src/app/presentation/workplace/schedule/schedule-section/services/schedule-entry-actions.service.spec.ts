// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { ScheduleEntryActionsService } from './schedule-entry-actions.service';
import { ScheduleDataService } from './schedule-data.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AbsenceMenuItem, AbsenceMenuService } from 'src/app/domain/services/schedule/absence-menu.service';
import { BreakCellParams, ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { DataScheduleService } from 'src/app/infrastructure/api/schedule/data-schedule.service';
import { DataBreakService } from 'src/app/infrastructure/api/break/data-break.service';
import { DataManagementScheduleNoteService } from 'src/app/domain/services/schedule-note/data-management-schedule-note.service';
import { DataManagementScheduleCommandService } from 'src/app/domain/services/schedule-command/data-management-schedule-command.service';
import { Break, BreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { IShiftSchedule, ShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { parseCalendarDate } from 'src/app/shared/helpers/calendar-date.helper';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

const ABSENCE_ITEM: AbsenceMenuItem = {
  id: 'absence-item-1',
  absenceId: 'absence-1',
  absenceName: 'Holiday',
  name: 'Holiday',
  color: '#000000',
  isDetail: false,
  defaultValue: 0,
};

function createShift(wireDate: string): IShiftSchedule {
  const shift = new ShiftSchedule();
  shift.shiftId = 'shift-1';
  shift.date = wireDate as unknown as Date;
  shift.startShift = '08:00:00';
  shift.endShift = '16:00:00';
  shift.workTime = 8;
  return shift;
}

describe('ScheduleEntryActionsService', () => {
  let service: ScheduleEntryActionsService;
  let dataManagement: {
    shiftSchedules: IShiftSchedule[];
    clients: { id: string }[];
    visibleStartDate: Date | null;
    visibleEndDate: Date | null;
    currentFilter: { paymentInterval: number };
    addWorkScheduleEntry: ReturnType<typeof vi.fn>;
  };
  let scheduleEntryCrud: {
    addBreakScheduleEntry: ReturnType<typeof vi.fn>;
    bulkAddBreakScheduleEntries: ReturnType<typeof vi.fn>;
  };

  function createGrid(startDate: Date): ScheduleDataService {
    return {
      startDate,
      rowGroupIndex: [0],
      isCellBeforeClientStart: () => false,
      isCellOutsideGroupPeriod: () => false,
      getGroupIndex: () => ({ id: 'client-1' }),
    } as unknown as ScheduleDataService;
  }

  beforeEach(() => {
    dataManagement = {
      shiftSchedules: [],
      clients: [{ id: 'client-1' }],
      visibleStartDate: null,
      visibleEndDate: null,
      currentFilter: { paymentInterval: 2 },
      addWorkScheduleEntry: vi.fn(),
    };
    scheduleEntryCrud = {
      addBreakScheduleEntry: vi.fn(),
      bulkAddBreakScheduleEntries: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        ScheduleEntryActionsService,
        { provide: TranslateService, useValue: { currentLang: 'de' } },
        { provide: DataManagementScheduleService, useValue: dataManagement },
        { provide: AbsenceMenuService, useValue: { getAbsenceMenuItems: () => [ABSENCE_ITEM] } },
        { provide: ScheduleEntryCrudService, useValue: scheduleEntryCrud },
        { provide: BaseCellManipulationService, useValue: {} },
        { provide: DataScheduleService, useValue: {} },
        { provide: DataBreakService, useValue: {} },
        { provide: DataManagementScheduleNoteService, useValue: {} },
        { provide: DataManagementScheduleCommandService, useValue: {} },
      ],
    });
    service = TestBed.inject(ScheduleEntryActionsService);
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('activates the configured zone', () => {
        expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
      });

      it.each(['2026-08-03', '2026-08-03T00:00:00Z', '2026-08-03T00:00:00'])(
        'adds work for the shift dated %s when its column is chosen',
        (wireDate) => {
          dataManagement.shiftSchedules = [createShift(wireDate)];

          service.addWorkFromShiftMenu('shift-1', 0, 2, createGrid(parseCalendarDate('2026-08-01') as Date));

          expect(dataManagement.addWorkScheduleEntry).toHaveBeenCalledTimes(1);
          const params = dataManagement.addWorkScheduleEntry.mock.calls[0][0] as { date: Date; shiftId: string };
          expect(params.shiftId).toBe('shift-1');
          expect(formatDateOnly(params.date)).toBe('2026-08-03');
        },
      );

      it('books a break for column k on the visible start date plus k', () => {
        dataManagement.visibleStartDate = parseCalendarDate('2026-08-01');
        dataManagement.visibleEndDate = parseCalendarDate('2026-09-06');

        service.addBreakFromAbsenceMenu(ABSENCE_ITEM.id, 0, 2, createGrid(parseCalendarDate('2026-08-01') as Date));

        const breakEntry = scheduleEntryCrud.addBreakScheduleEntry.mock.calls[0][0] as Break;
        expect(formatDateOnly(breakEntry.currentDate)).toBe('2026-08-03');
        expect(breakEntry.periodStart).toBe('2026-08-01');
        expect(breakEntry.periodEnd).toBe('2026-09-06');
      });

      it('adopts a UTC-midnight break placeholder on its own calendar days', async () => {
        const placeholder = new BreakPlaceholder();
        placeholder.clientId = 'client-1';
        placeholder.absenceId = ABSENCE_ITEM.absenceId;
        placeholder.from = '2026-08-03T00:00:00Z' as unknown as Date;
        placeholder.until = '2026-08-05T00:00:00Z' as unknown as Date;

        await service.adoptBreakPlaceholder(placeholder, undefined);

        const entries = scheduleEntryCrud.bulkAddBreakScheduleEntries.mock.calls[0][0] as BreakCellParams[];
        expect(entries.map((e) => formatDateOnly(e.date))).toEqual(['2026-08-03', '2026-08-04', '2026-08-05']);
      });
    });
  }
});
