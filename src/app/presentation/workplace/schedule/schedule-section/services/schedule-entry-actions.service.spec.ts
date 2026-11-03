// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ScheduleEntryActionsService } from './schedule-entry-actions.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ScheduleDataService } from './schedule-data.service';
import { ShiftPlacementService } from './shift-placement.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AbsenceMenuService } from 'src/app/domain/services/schedule/absence-menu.service';
import { AbsenceMenuItem } from 'src/app/domain/services/schedule/absence-menu-item.interface';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { BreakCellParams } from 'src/app/domain/services/schedule/break-cell-params.interface';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { DataManagementWorkService } from 'src/app/domain/services/work/data-management-work.service';
import { DataManagementBreakService } from 'src/app/domain/services/break/data-management-break.service';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { DataManagementScheduleNoteService } from 'src/app/domain/services/schedule-note/data-management-schedule-note.service';
import { DataManagementScheduleCommandService } from 'src/app/domain/services/schedule-command/data-management-schedule-command.service';
import { AbsenceTakenWorksConfirmService } from 'src/app/presentation/workplace/schedule/services/absence-taken-works-confirm.service';
import { Break } from 'src/app/domain/models/break/break-class';
import { BreakPlaceholder } from 'src/app/domain/models/break/break-placeholder-class';
import { ShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule.interface';
import { parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { formatDateOnly } from 'src/app/domain/helpers/date.helper';
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
  let toastShowService: { showError: ReturnType<typeof vi.fn> };
  let dataManagement: {
    shiftSchedules: IShiftSchedule[];
    clients: { id: string }[];
    visibleStartDate: Date | null;
    visibleEndDate: Date | null;
    currentFilter: { paymentInterval: number };
    addWorkScheduleEntry: ReturnType<typeof vi.fn>;
    readDatas: ReturnType<typeof vi.fn>;
    reverseMovedWorkScheduleEntry: ReturnType<typeof vi.fn>;
  };
  let workService: {
    confirmWork: ReturnType<typeof vi.fn>;
    unconfirmWork: ReturnType<typeof vi.fn>;
  };
  let breakService: {
    confirmBreak: ReturnType<typeof vi.fn>;
    unconfirmBreak: ReturnType<typeof vi.fn>;
  };
  let takenWorksConfirm: { confirm: ReturnType<typeof vi.fn>; confirmBreak: ReturnType<typeof vi.fn> };
  let scheduleEntryCrud: {
    addBreakScheduleEntry: ReturnType<typeof vi.fn>;
    bulkAddBreakScheduleEntries: ReturnType<typeof vi.fn>;
  };

  function createGrid(startDate: Date): ScheduleDataService {
    return {
      startDate,
      rowGroupIndex: [0],
      isCellOutsideMembershipPeriod: () => false,
      isCellOutsideGroupPeriod: () => false,
      isColumnOutsideScenario: () => false,
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
      readDatas: vi.fn(),
      reverseMovedWorkScheduleEntry: vi.fn().mockResolvedValue(undefined),
    };
    workService = {
      confirmWork: vi.fn().mockReturnValue(of({})),
      unconfirmWork: vi.fn().mockReturnValue(of({})),
    };
    breakService = {
      confirmBreak: vi.fn().mockReturnValue(of({})),
      unconfirmBreak: vi.fn().mockReturnValue(of({})),
    };
    takenWorksConfirm = {
      confirm: vi.fn().mockResolvedValue(true),
      confirmBreak: vi.fn().mockResolvedValue(true),
    };
    scheduleEntryCrud = {
      addBreakScheduleEntry: vi.fn(),
      bulkAddBreakScheduleEntries: vi.fn().mockResolvedValue(undefined),
    };

    toastShowService = { showError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ScheduleEntryActionsService,
        ShiftPlacementService,
        { provide: TranslateService, useValue: { currentLang: 'de', instant: (key: string) => key } },
        { provide: ToastShowService, useValue: toastShowService },
        { provide: DataManagementScheduleService, useValue: dataManagement },
        { provide: AbsenceMenuService, useValue: { getAbsenceMenuItems: () => [ABSENCE_ITEM] } },
        { provide: AbsenceTakenWorksConfirmService, useValue: takenWorksConfirm },
        { provide: ScheduleEntryCrudService, useValue: scheduleEntryCrud },
        { provide: BaseCellManipulationService, useValue: {} },
        { provide: DataManagementWorkService, useValue: workService },
        { provide: DataManagementBreakService, useValue: breakService },
        { provide: DataManagementScheduleNoteService, useValue: {} },
        { provide: DataManagementScheduleCommandService, useValue: {} },
      ],
    });
    service = TestBed.inject(ScheduleEntryActionsService);
  });

  function gridWithEntry(entryType: WorkScheduleEntryType | null): ScheduleDataService {
    return {
      getWorkScheduleEntryForCell: () => (entryType === null ? undefined : { id: 'entry-1', entryType }),
    } as unknown as ScheduleDataService;
  }

  describe('deleting on a day outside the active scenario', () => {
    const grid = (outsideScenario: boolean): ScheduleDataService =>
      ({
        rowGroupIndex: [0],
        getWorkScheduleEntryForCell: () => ({ id: 'work-1', sourceId: 'work-1', entryId: 'shift-1', entryType: 0 }),
        getDateForColumn: () => new Date(2026, 10, 30),
        isColumnOutsideScenario: () => outsideScenario,
      }) as unknown as ScheduleDataService;

    it('resolves nothing to delete', () => {
      expect(service.getDeleteInfoForPosition(grid(true), 0, 0)).toBeNull();
    });

    it('resolves the entry inside the scenario', () => {
      expect(service.getDeleteInfoForPosition(grid(false), 0, 0)?.id).toBe('work-1');
    });
  });

  describe('taking back a move', () => {
    it('gives the service back to the person it came from', () => {
      const entry = new ScheduleCell();
      entry.sourceId = 'work-1';
      entry.clientId = 'stand-in';
      entry.movedFromClientId = 'origin';
      entry.entryDate = '2026-11-04' as unknown as Date;

      service.reverseMove(entry);

      expect(dataManagement.reverseMovedWorkScheduleEntry).toHaveBeenCalledWith(
        'work-1', 'stand-in', 'origin', parseCalendarDate('2026-11-04'));
    });

    it('does nothing for a service that was not moved', () => {
      const entry = new ScheduleCell();
      entry.sourceId = 'work-1';
      entry.entryDate = new Date(2026, 10, 4);

      service.reverseMove(entry);

      expect(dataManagement.reverseMovedWorkScheduleEntry).not.toHaveBeenCalled();
    });
  });

  describe('confirm and unconfirm', () => {
    it('confirms a work entry through the work service and re-reads the schedule', () => {
      service.confirmWork(0, 0, gridWithEntry(WorkScheduleEntryType.Work));

      expect(workService.confirmWork).toHaveBeenCalledWith('entry-1');
      expect(breakService.confirmBreak).not.toHaveBeenCalled();
      expect(dataManagement.readDatas).toHaveBeenCalledWith(false);
    });

    it('confirms a break entry through the break service and re-reads the schedule', () => {
      service.confirmWork(0, 0, gridWithEntry(WorkScheduleEntryType.Break));

      expect(breakService.confirmBreak).toHaveBeenCalledWith('entry-1');
      expect(workService.confirmWork).not.toHaveBeenCalled();
      expect(dataManagement.readDatas).toHaveBeenCalledWith(false);
    });

    it('shows the reason the backend gave when it refuses to confirm a service that has not ended', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      workService.confirmWork.mockReturnValue(
        throwError(() => ({ status: 400, error: { detail: 'The service has not ended yet' } })),
      );

      service.confirmWork(0, 0, gridWithEntry(WorkScheduleEntryType.Work));

      expect(toastShowService.showError).toHaveBeenCalledWith('The service has not ended yet');
      expect(dataManagement.readDatas).not.toHaveBeenCalled();
    });

    it('unconfirms a work entry through the work service and re-reads the schedule', () => {
      service.unconfirmWork(0, 0, gridWithEntry(WorkScheduleEntryType.Work));

      expect(workService.unconfirmWork).toHaveBeenCalledWith('entry-1');
      expect(breakService.unconfirmBreak).not.toHaveBeenCalled();
      expect(dataManagement.readDatas).toHaveBeenCalledWith(false);
    });

    it('unconfirms a break entry through the break service and re-reads the schedule', () => {
      service.unconfirmWork(0, 0, gridWithEntry(WorkScheduleEntryType.Break));

      expect(breakService.unconfirmBreak).toHaveBeenCalledWith('entry-1');
      expect(workService.unconfirmWork).not.toHaveBeenCalled();
      expect(dataManagement.readDatas).toHaveBeenCalledWith(false);
    });

    it('ignores cells without an entry and entry types that cannot be confirmed', () => {
      service.confirmWork(0, 0, gridWithEntry(null));
      service.confirmWork(0, 0, gridWithEntry(WorkScheduleEntryType.WorkChange));
      service.unconfirmWork(0, 0, gridWithEntry(WorkScheduleEntryType.ScheduleNote));

      expect(workService.confirmWork).not.toHaveBeenCalled();
      expect(workService.unconfirmWork).not.toHaveBeenCalled();
      expect(breakService.confirmBreak).not.toHaveBeenCalled();
      expect(breakService.unconfirmBreak).not.toHaveBeenCalled();
      expect(dataManagement.readDatas).not.toHaveBeenCalled();
    });
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

      it('books a break for column k on the visible start date plus k', async () => {
        dataManagement.visibleStartDate = parseCalendarDate('2026-08-01');
        dataManagement.visibleEndDate = parseCalendarDate('2026-09-06');

        await service.addBreakFromAbsenceMenu(ABSENCE_ITEM.id, 0, 2, createGrid(parseCalendarDate('2026-08-01') as Date));

        const breakEntry = scheduleEntryCrud.addBreakScheduleEntry.mock.calls[0][0] as Break;
        expect(formatDateOnly(breakEntry.currentDate)).toBe('2026-08-03');
        expect(breakEntry.periodStart).toBe('2026-08-01');
        expect(breakEntry.periodEnd).toBe('2026-09-06');
      });

      it('writes no break when the planner keeps the service', async () => {
        takenWorksConfirm.confirmBreak.mockResolvedValue(false);

        await service.addBreakFromAbsenceMenu(ABSENCE_ITEM.id, 0, 2, createGrid(parseCalendarDate('2026-08-01') as Date));

        expect(takenWorksConfirm.confirmBreak).toHaveBeenCalledTimes(1);
        expect(scheduleEntryCrud.addBreakScheduleEntry).not.toHaveBeenCalled();
      });

      it('adopts no placeholder when the planner keeps the services', async () => {
        takenWorksConfirm.confirm.mockResolvedValue(false);
        const placeholder = new BreakPlaceholder();
        placeholder.clientId = 'client-1';
        placeholder.absenceId = ABSENCE_ITEM.absenceId;
        placeholder.from = '2026-08-03T00:00:00Z' as unknown as Date;
        placeholder.until = '2026-08-05T00:00:00Z' as unknown as Date;

        await service.adoptBreakPlaceholder(placeholder, undefined);

        expect(takenWorksConfirm.confirm).toHaveBeenCalledTimes(1);
        expect(scheduleEntryCrud.bulkAddBreakScheduleEntries).not.toHaveBeenCalled();
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
