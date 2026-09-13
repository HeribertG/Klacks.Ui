// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpErrorResponse } from '@angular/common/http';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ScheduleEntryCrudService,
  ScheduleCellParams,
  DeleteWorkScheduleEntryParams,
} from './schedule-entry-crud.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';
import { WorkScheduleLoaderService } from './work-schedule-loader.service';
import { DataManagementWorkService } from '../work/data-management-work.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import { IShiftSchedule } from '../../models/schedule/shift-schedule-class';
import { ShiftSporadic } from '../../enums/shift-sporadic.enum';
import { SporadicStatus } from '../../enums/sporadic-status.enum';
import { IWorkFilter } from '../../models/schedule/schedule-class';
import { DataManagementBreakService } from '../break/data-management-break.service';
import { DataWorkChangeService } from 'src/app/infrastructure/api/workchange/data-work-change.service';
import { GroupSelectionService } from '../group/group-selection.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType, UndoOfferedEvent } from 'src/app/domain/events/domain-events';
import { SCHEDULE_UNDO } from 'src/app/domain/constants/schedule-undo.constants';
import { IClientWork } from '../../models/schedule/schedule-class';
import { WorkScheduleEntryType } from '../../models/schedule/work-schedule-class';
import { parseCalendarDate } from 'src/app/shared/helpers/calendar-date.helper';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  CalendarTestZone,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

function createMockWorkFilter(): IWorkFilter {
  return {
    currentMonth: 1,
    currentYear: 2025,
    paymentInterval: 2,
    works: [],
    selectedGroup: undefined,
    searchString: '',
    orderBy: '',
    sortOrder: '',
    numberOfItemsPerPage: 5,
    requiredPage: 0,
    numberOfItemOnPreviousPage: undefined,
    firstItemOnLastPage: undefined,
    isPreviousPage: undefined,
    isNextPage: undefined,
    showEmployees: true,
    showExtern: true,
    individualSort: false,
  };
}

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
    quantity: 5,
    sporadicScope: ShiftSporadic.Week,
    sporadicStatus: SporadicStatus.None,
    engaged: 2,
    qualifications: [],
    ...overrides,
  };
}

describe('ScheduleEntryCrudService', () => {
  let service: ScheduleEntryCrudService;

  let dataWorkScheduleMock: {
    getWorkSchedule: ReturnType<typeof vi.fn>;
  };

  let shiftLoaderMock: {
    shiftSchedules: IShiftSchedule[];
  };

  let workScheduleLoaderMock: {
    replaceClientEntriesForDays: ReturnType<typeof vi.fn>;
    updateClientNeededRows: ReturnType<typeof vi.fn>;
    startDate: Date | null;
    endDate: Date | null;
    periodHours: Map<string, number>;
    clients: Partial<IClientWork>[];
  };

  let workCrudMock: {
    createWork: ReturnType<typeof vi.fn>;
    deleteWorkById: ReturnType<typeof vi.fn>;
    restoreWorkById: ReturnType<typeof vi.fn>;
    bulkDeleteWorks: ReturnType<typeof vi.fn>;
    bulkCreateWorks: ReturnType<typeof vi.fn>;
    reassignWorkClient: ReturnType<typeof vi.fn>;
  };

  let availableShiftsCalcMock: {
    calculate: ReturnType<typeof vi.fn>;
  };

  let breakServiceMock: {
    deleteBreak: ReturnType<typeof vi.fn>;
    bulkDeleteBreaks: ReturnType<typeof vi.fn>;
    addBreak: ReturnType<typeof vi.fn>;
    bulkAddBreaks: ReturnType<typeof vi.fn>;
  };

  let workChangeServiceMock: {
    delete: ReturnType<typeof vi.fn>;
  };

  let eventBusMock: {
    emit: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    onAny: ReturnType<typeof vi.fn>;
  };

  function lastUndoOffer(): UndoOfferedEvent {
    const call = [...eventBusMock.emit.mock.calls]
      .reverse()
      .find((args) => args[0] === DomainEventType.UNDO_OFFERED);
    return call?.[1] as UndoOfferedEvent;
  }

  beforeEach(() => {
    // Arrange
    dataWorkScheduleMock = {
      getWorkSchedule: vi.fn().mockReturnValue(of({ entries: [] })),
    };

    shiftLoaderMock = {
      shiftSchedules: [],
    };

    workScheduleLoaderMock = {
      replaceClientEntriesForDays: vi.fn(),
      updateClientNeededRows: vi.fn(),
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      periodHours: new Map(),
      clients: [{ id: 'client-1', firstName: 'Anna', name: 'Muster' }],
    };

    workCrudMock = {
      createWork: vi.fn().mockResolvedValue({ id: 'new-work-id', scheduleEntries: [{ clientId: 'client-1' }] }),
      deleteWorkById: vi.fn().mockResolvedValue({ scheduleEntries: [{ clientId: 'client-1' }] }),
      restoreWorkById: vi.fn().mockResolvedValue({ scheduleEntries: [{ clientId: 'client-1' }] }),
      bulkDeleteWorks: vi.fn().mockResolvedValue({
        successCount: 0,
        failedCount: 0,
        deletedIds: [],
        affectedShifts: [],
      }),
      bulkCreateWorks: vi.fn().mockResolvedValue({ periodHours: {} }),
      reassignWorkClient: vi.fn().mockResolvedValue({
        work: { clientId: 'client-2', periodHours: { hours: 8 }, scheduleEntries: [{ clientId: 'client-2' }] },
        sourceScheduleEntries: [{ clientId: 'client-1' }],
        sourcePeriodHours: { hours: 3 },
      }),
    };

    availableShiftsCalcMock = {
      calculate: vi.fn(),
    };

    breakServiceMock = {
      deleteBreak: vi.fn().mockReturnValue(of({})),
      bulkDeleteBreaks: vi.fn().mockReturnValue(of({ periodHours: {} })),
      addBreak: vi.fn().mockReturnValue(of({ periodHours: {}, scheduleEntries: [] })),
      bulkAddBreaks: vi.fn().mockReturnValue(of({ periodHours: {} })),
    };

    workChangeServiceMock = {
      delete: vi.fn().mockReturnValue(of({ periodHours: {}, scheduleEntries: [] })),
    };

    eventBusMock = {
      emit: vi.fn(),
      on: vi.fn().mockReturnValue(of()),
      onAny: vi.fn().mockReturnValue(of()),
    };

    TestBed.configureTestingModule({
      providers: [
        // AnalyseScenarioService listens for background-optimiser candidates on connect.
        { provide: SCHEDULE_SIGNALR, useValue: { wizard4CandidatesChanged$: new Subject<never>() } },
        ScheduleEntryCrudService,
        { provide: DataWorkScheduleService, useValue: dataWorkScheduleMock },
        { provide: DataWorkChangeService, useValue: workChangeServiceMock },
        { provide: ShiftScheduleLoaderService, useValue: shiftLoaderMock },
        { provide: WorkScheduleLoaderService, useValue: workScheduleLoaderMock },
        { provide: DataManagementWorkService, useValue: workCrudMock },
        { provide: AvailableShiftsCalculatorService, useValue: availableShiftsCalcMock },
        { provide: DataManagementBreakService, useValue: breakServiceMock },
        { provide: GroupSelectionService, useValue: { selectedGroupId: undefined, selectedGroup: undefined } },
        { provide: EVENT_BUS_TOKEN, useValue: eventBusMock },
      ],
    });

    service = TestBed.inject(ScheduleEntryCrudService);
  });

  describe('addWorkScheduleEntry', () => {
    it('should call createWork with correct params including period dates', async () => {
      // Arrange
      const params: ScheduleCellParams = {
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
        workTime: 480,
        startTime: '08:00:00',
        endTime: '16:00:00',
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.addWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(workCrudMock.createWork).toHaveBeenCalledWith({
        ...params,
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
      });
    });

    it('should use scheduleEntries from response to update client data', async () => {
      // Arrange
      const params: ScheduleCellParams = {
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
        workTime: 480,
        startTime: '08:00:00',
        endTime: '16:00:00',
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.addWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(workScheduleLoaderMock.replaceClientEntriesForDays).toHaveBeenCalled();
    });

    it('should update shift engaged count after adding work', async () => {
      // Arrange
      const testDate = new Date('2025-01-15');
      testDate.setHours(0, 0, 0, 0);

      shiftLoaderMock.shiftSchedules = [
        createMockShiftSchedule({
          shiftId: 'shift-1',
          date: testDate,
          engaged: 2,
        }),
      ];

      const params: ScheduleCellParams = {
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
        workTime: 480,
        startTime: '08:00:00',
        endTime: '16:00:00',
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.addWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(shiftLoaderMock.shiftSchedules[0].engaged).toBe(3);
      expect(availableShiftsCalcMock.calculate).toHaveBeenCalled();
    });

    it('should trigger scheduleRefreshed signal after refresh', async () => {
      // Arrange
      const params: ScheduleCellParams = {
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
        workTime: 480,
        startTime: '08:00:00',
        endTime: '16:00:00',
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.addWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.scheduleRefreshed()).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(service.scheduleRefreshed()).toBe(false);
    });
  });

  describe('deleteWorkScheduleEntry', () => {
    it('should call deleteWorkById with correct workId', async () => {
      // Arrange
      const params: DeleteWorkScheduleEntryParams = {
        id: 'work-123',
        sourceId: 'work-123',
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        entryId: 'shift-1',
        entryType: 0,
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.deleteWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(workCrudMock.deleteWorkById).toHaveBeenCalledWith('work-123', '2025-01-01', '2025-01-31');
    });

    it('should use scheduleEntries from response after deleting work', async () => {
      // Arrange
      const params: DeleteWorkScheduleEntryParams = {
        id: 'work-123',
        sourceId: 'work-123',
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        entryId: 'shift-1',
        entryType: 0,
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.deleteWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(workScheduleLoaderMock.replaceClientEntriesForDays).toHaveBeenCalled();
    });

    it('should decrease shift engaged count after deleting work', async () => {
      // Arrange
      const testDate = new Date('2025-01-15');
      testDate.setHours(0, 0, 0, 0);

      shiftLoaderMock.shiftSchedules = [
        createMockShiftSchedule({
          shiftId: 'shift-1',
          date: testDate,
          engaged: 5,
        }),
      ];

      const params: DeleteWorkScheduleEntryParams = {
        id: 'work-123',
        sourceId: 'work-123',
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        entryId: 'shift-1',
        entryType: 0,
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.deleteWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(shiftLoaderMock.shiftSchedules[0].engaged).toBe(4);
      expect(availableShiftsCalcMock.calculate).toHaveBeenCalled();
    });

    it('should not set engaged below zero', async () => {
      // Arrange
      const testDate = new Date('2025-01-15');
      testDate.setHours(0, 0, 0, 0);

      shiftLoaderMock.shiftSchedules = [
        createMockShiftSchedule({
          shiftId: 'shift-1',
          date: testDate,
          engaged: 0,
        }),
      ];

      const params: DeleteWorkScheduleEntryParams = {
        id: 'work-123',
        sourceId: 'work-123',
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        entryId: 'shift-1',
        entryType: 0,
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.deleteWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(shiftLoaderMock.shiftSchedules[0].engaged).toBe(0);
    });
  });

  describe('undo offer after deleting a work entry', () => {
    const workParams: DeleteWorkScheduleEntryParams = {
      id: 'work-123',
      sourceId: 'work-123',
      clientId: 'client-1',
      date: new Date('2025-01-15'),
      entryId: 'shift-1',
      entryType: 0,
    };

    it('should offer an undo with title, client name, date and the configured delay', async () => {
      // Act
      await service.deleteWorkScheduleEntry({ ...workParams }, createMockWorkFilter());

      // Assert
      const offer = lastUndoOffer();
      expect(offer).toBeDefined();
      expect(offer.messageKey).toBe(SCHEDULE_UNDO.TITLE_KEY);
      expect(offer.labelKey).toBe(SCHEDULE_UNDO.LABEL_KEY);
      expect(offer.delayMs).toBe(SCHEDULE_UNDO.TOAST_DELAY_MS);
      expect(offer.detail).toBe('Anna Muster, 2025-01-15');
    });

    it('should fall back to the date when the client is unknown', async () => {
      // Arrange
      workScheduleLoaderMock.clients = [];

      // Act
      await service.deleteWorkScheduleEntry({ ...workParams }, createMockWorkFilter());

      // Assert
      expect(lastUndoOffer().detail).toBe('2025-01-15');
    });

    it('should NOT offer an undo when a break is deleted', async () => {
      // Act
      await service.deleteWorkScheduleEntry(
        { ...workParams, entryType: WorkScheduleEntryType.Break },
        createMockWorkFilter(),
      );

      // Assert
      expect(lastUndoOffer()).toBeUndefined();
    });

    it('should restore the work and re-apply the response when the undo is used', async () => {
      // Arrange
      await service.deleteWorkScheduleEntry({ ...workParams }, createMockWorkFilter());
      workScheduleLoaderMock.replaceClientEntriesForDays.mockClear();

      // Act
      lastUndoOffer().onUndo();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(workCrudMock.restoreWorkById).toHaveBeenCalledWith('work-123');
      expect(workScheduleLoaderMock.replaceClientEntriesForDays).toHaveBeenCalled();
    });

    it('should raise the shift engaged count back up after a restore', async () => {
      // Arrange
      const testDate = new Date('2025-01-15');
      testDate.setHours(0, 0, 0, 0);
      shiftLoaderMock.shiftSchedules = [
        createMockShiftSchedule({ shiftId: 'shift-1', date: testDate, engaged: 5 }),
      ];
      await service.deleteWorkScheduleEntry({ ...workParams }, createMockWorkFilter());
      expect(shiftLoaderMock.shiftSchedules[0].engaged).toBe(4);

      // Act
      lastUndoOffer().onUndo();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(shiftLoaderMock.shiftSchedules[0].engaged).toBe(5);
    });

    it('should emit a generic error event when the restore is rejected', async () => {
      // Arrange
      workCrudMock.restoreWorkById.mockRejectedValueOnce(new HttpErrorResponse({ status: 404 }));
      await service.deleteWorkScheduleEntry({ ...workParams }, createMockWorkFilter());

      // Act
      lastUndoOffer().onUndo();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(eventBusMock.emit).toHaveBeenCalledWith(DomainEventType.ERROR, { message: SCHEDULE_UNDO.FAILED_KEY });
    });

    it('should emit the conflict message when the slot was taken meanwhile (409)', async () => {
      // Arrange
      workCrudMock.restoreWorkById.mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }));
      await service.deleteWorkScheduleEntry({ ...workParams }, createMockWorkFilter());

      // Act
      lastUndoOffer().onUndo();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(eventBusMock.emit).toHaveBeenCalledWith(DomainEventType.ERROR, { message: SCHEDULE_UNDO.CONFLICT_KEY });
      expect(eventBusMock.emit).not.toHaveBeenCalledWith(DomainEventType.ERROR, { message: SCHEDULE_UNDO.FAILED_KEY });
    });

    it('should fall back to the generic message for a non-http rejection', async () => {
      // Arrange
      workCrudMock.restoreWorkById.mockRejectedValueOnce(new Error('offline'));
      await service.deleteWorkScheduleEntry({ ...workParams }, createMockWorkFilter());

      // Act
      lastUndoOffer().onUndo();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(eventBusMock.emit).toHaveBeenCalledWith(DomainEventType.ERROR, { message: SCHEDULE_UNDO.FAILED_KEY });
    });
  });

  describe('reassignWorkScheduleEntry', () => {
    it('should call reassignWorkClient with workId and targetClientId', async () => {
      // Act
      await service.reassignWorkScheduleEntry('work-123', 'client-1', 'client-2', new Date('2025-01-15'));

      // Assert
      expect(workCrudMock.reassignWorkClient).toHaveBeenCalledWith('work-123', 'client-2');
    });

    it('should apply periodHours and scheduleEntries for the target client from a single response', async () => {
      // Act
      await service.reassignWorkScheduleEntry('work-123', 'client-1', 'client-2', new Date('2025-01-15'));

      // Assert
      expect(workScheduleLoaderMock.periodHours.get('client-2')).toEqual({ hours: 8 });
      expect(workScheduleLoaderMock.replaceClientEntriesForDays).toHaveBeenCalledWith(
        'client-2',
        expect.any(Date),
        expect.any(Date),
        [{ clientId: 'client-2' }],
      );
    });

    it('should recalculate periodHours for the source client, not just the target', async () => {
      // Act
      await service.reassignWorkScheduleEntry('work-123', 'client-1', 'client-2', new Date('2025-01-15'));

      // Assert
      expect(workScheduleLoaderMock.periodHours.get('client-1')).toEqual({ hours: 3 });
    });

    it('should apply sourceScheduleEntries for the source client without an extra HTTP call', async () => {
      // Act
      await service.reassignWorkScheduleEntry('work-123', 'client-1', 'client-2', new Date('2025-01-15'));

      // Assert
      expect(workScheduleLoaderMock.replaceClientEntriesForDays).toHaveBeenCalledWith(
        'client-1',
        expect.any(Date),
        expect.any(Date),
        [{ clientId: 'client-1' }],
      );
      expect(dataWorkScheduleMock.getWorkSchedule).not.toHaveBeenCalled();
    });
  });

  describe('bulkDeleteWorkScheduleEntries', () => {
    it('should do nothing when entries array is empty', async () => {
      // Arrange
      const entries: DeleteWorkScheduleEntryParams[] = [];
      const workFilter = createMockWorkFilter();

      // Act
      service.bulkDeleteWorkScheduleEntries(entries, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(workCrudMock.bulkDeleteWorks).not.toHaveBeenCalled();
    });

    it('should call bulkDeleteWorks with all workIds', async () => {
      // Arrange
      const entries: DeleteWorkScheduleEntryParams[] = [
        { id: 'work-1', sourceId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), entryId: 'shift-1', entryType: 0 },
        { id: 'work-2', sourceId: 'work-2', clientId: 'client-1', date: new Date('2025-01-16'), entryId: 'shift-1', entryType: 0 },
        { id: 'work-3', sourceId: 'work-3', clientId: 'client-2', date: new Date('2025-01-15'), entryId: 'shift-2', entryType: 0 },
      ];
      const workFilter = createMockWorkFilter();

      workCrudMock.bulkDeleteWorks.mockResolvedValue({
        successCount: 3,
        failedCount: 0,
        deletedIds: ['work-1', 'work-2', 'work-3'],
        affectedShifts: [],
      });

      // Act
      service.bulkDeleteWorkScheduleEntries(entries, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(workCrudMock.bulkDeleteWorks).toHaveBeenCalledWith(['work-1', 'work-2', 'work-3']);
    });

    it('should refresh for all entries regardless of successCount', async () => {
      // Arrange
      const entries: DeleteWorkScheduleEntryParams[] = [
        { id: 'work-1', sourceId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), entryId: 'shift-1', entryType: 0 },
      ];
      const workFilter = createMockWorkFilter();

      workCrudMock.bulkDeleteWorks.mockResolvedValue({
        successCount: 0,
        failedCount: 1,
        deletedIds: [],
        affectedShifts: [],
      });

      // Act
      service.bulkDeleteWorkScheduleEntries(entries, workFilter);
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalled();
    });

    it('should refresh schedule for each affected client', async () => {
      // Arrange
      const entries: DeleteWorkScheduleEntryParams[] = [
        { id: 'work-1', sourceId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), entryId: 'shift-1', entryType: 0 },
        { id: 'work-2', sourceId: 'work-2', clientId: 'client-2', date: new Date('2025-01-16'), entryId: 'shift-2', entryType: 0 },
      ];
      const workFilter = createMockWorkFilter();

      workCrudMock.bulkDeleteWorks.mockResolvedValue({
        successCount: 2,
        failedCount: 0,
        deletedIds: ['work-1', 'work-2'],
        affectedShifts: [],
      });

      // Act
      service.bulkDeleteWorkScheduleEntries(entries, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalledTimes(1);
    });

    it('should update neededRows after bulk delete', async () => {
      // Arrange
      const entries: DeleteWorkScheduleEntryParams[] = [
        { id: 'work-1', sourceId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), entryId: 'shift-1', entryType: 0 },
      ];
      const workFilter = createMockWorkFilter();

      workCrudMock.bulkDeleteWorks.mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        deletedIds: ['work-1'],
        affectedShifts: [],
      });

      // Act
      service.bulkDeleteWorkScheduleEntries(entries, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(workScheduleLoaderMock.updateClientNeededRows).toHaveBeenCalled();
    });

    it('should decrease shift engaged for all deleted entries', async () => {
      // Arrange
      const testDate = new Date('2025-01-15');
      testDate.setHours(0, 0, 0, 0);

      shiftLoaderMock.shiftSchedules = [
        createMockShiftSchedule({
          shiftId: 'shift-1',
          date: testDate,
          engaged: 5,
        }),
      ];

      const entries: DeleteWorkScheduleEntryParams[] = [
        { id: 'work-1', sourceId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), entryId: 'shift-1', entryType: 0 },
        { id: 'work-2', sourceId: 'work-2', clientId: 'client-2', date: new Date('2025-01-15'), entryId: 'shift-1', entryType: 0 },
      ];
      const workFilter = createMockWorkFilter();

      workCrudMock.bulkDeleteWorks.mockResolvedValue({
        successCount: 2,
        failedCount: 0,
        deletedIds: ['work-1', 'work-2'],
        affectedShifts: [],
      });

      // Act
      service.bulkDeleteWorkScheduleEntries(entries, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(shiftLoaderMock.shiftSchedules[0].engaged).toBe(3);
    });

    it('should merge overlapping date ranges for same client and shift', async () => {
      // Arrange
      const entries: DeleteWorkScheduleEntryParams[] = [
        { id: 'work-1', sourceId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), entryId: 'shift-1', entryType: 0 },
        { id: 'work-2', sourceId: 'work-2', clientId: 'client-1', date: new Date('2025-01-16'), entryId: 'shift-1', entryType: 0 },
        { id: 'work-3', sourceId: 'work-3', clientId: 'client-1', date: new Date('2025-01-17'), entryId: 'shift-1', entryType: 0 },
      ];
      const workFilter = createMockWorkFilter();

      workCrudMock.bulkDeleteWorks.mockResolvedValue({
        successCount: 3,
        failedCount: 0,
        deletedIds: ['work-1', 'work-2', 'work-3'],
        affectedShifts: [],
      });

      // Act
      service.bulkDeleteWorkScheduleEntries(entries, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshClientScheduleForDays', () => {
    it('should request 3-day range centered on given date', async () => {
      // Arrange
      const clientId = 'client-1';
      const centerDate = new Date('2025-01-15');

      // Act
      service.refreshClientScheduleForDays(clientId, centerDate);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2025-01-14',
          endDate: '2025-01-16',
        })
      );
    });

    it('should filter entries for correct client', async () => {
      // Arrange
      dataWorkScheduleMock.getWorkSchedule.mockReturnValue(of({
        entries: [
          { clientId: 'client-1', date: '2025-01-15' },
          { clientId: 'client-2', date: '2025-01-15' },
          { clientId: 'client-1', date: '2025-01-14' },
        ],
      }));

      const clientId = 'client-1';
      const centerDate = new Date('2025-01-15');

      // Act
      service.refreshClientScheduleForDays(clientId, centerDate);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(workScheduleLoaderMock.replaceClientEntriesForDays).toHaveBeenCalledWith(
        'client-1',
        expect.any(Date),
        expect.any(Date),
        expect.arrayContaining([
          expect.objectContaining({ clientId: 'client-1' }),
        ])
      );
      const calledEntries = workScheduleLoaderMock.replaceClientEntriesForDays.mock.calls[0][3];
      expect(calledEntries.length).toBe(2);
      expect(calledEntries.every((e: { clientId: string }) => e.clientId === 'client-1')).toBe(true);
    });
  });

  describe('mergeOverlappingDateRanges (integration test via bulkDelete)', () => {
    it('should create single range for consecutive dates', async () => {
      // Arrange
      const entries: DeleteWorkScheduleEntryParams[] = [
        { id: 'work-1', sourceId: 'work-1', clientId: 'client-1', date: new Date('2025-01-13'), entryId: 'shift-1', entryType: 0 },
        { id: 'work-2', sourceId: 'work-2', clientId: 'client-1', date: new Date('2025-01-14'), entryId: 'shift-1', entryType: 0 },
        { id: 'work-3', sourceId: 'work-3', clientId: 'client-1', date: new Date('2025-01-15'), entryId: 'shift-1', entryType: 0 },
      ];
      const workFilter = createMockWorkFilter();

      workCrudMock.bulkDeleteWorks.mockResolvedValue({
        successCount: 3,
        failedCount: 0,
        deletedIds: ['work-1', 'work-2', 'work-3'],
        affectedShifts: [],
      });

      // Act
      service.bulkDeleteWorkScheduleEntries(entries, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalledTimes(1);
    });

    it('should create separate ranges for non-consecutive dates', async () => {
      // Arrange
      const entries: DeleteWorkScheduleEntryParams[] = [
        { id: 'work-1', sourceId: 'work-1', clientId: 'client-1', date: new Date('2025-01-10'), entryId: 'shift-1', entryType: 0 },
        { id: 'work-2', sourceId: 'work-2', clientId: 'client-1', date: new Date('2025-01-20'), entryId: 'shift-1', entryType: 0 },
      ];
      const workFilter = createMockWorkFilter();

      workCrudMock.bulkDeleteWorks.mockResolvedValue({
        successCount: 2,
        failedCount: 0,
        deletedIds: ['work-1', 'work-2'],
        affectedShifts: [],
      });

      // Act
      service.bulkDeleteWorkScheduleEntries(entries, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalledTimes(1);
    });

    it('should handle different shifts for same client separately', async () => {
      // Arrange
      const entries: DeleteWorkScheduleEntryParams[] = [
        { id: 'work-1', sourceId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), entryId: 'shift-1', entryType: 0 },
        { id: 'work-2', sourceId: 'work-2', clientId: 'client-1', date: new Date('2025-01-15'), entryId: 'shift-2', entryType: 0 },
      ];
      const workFilter = createMockWorkFilter();

      workCrudMock.bulkDeleteWorks.mockResolvedValue({
        successCount: 2,
        failedCount: 0,
        deletedIds: ['work-1', 'work-2'],
        affectedShifts: [],
      });

      // Act
      service.bulkDeleteWorkScheduleEntries(entries, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('calendar dates across browser time zones', () => {
    const AUTUMN_DST_SWITCH: Record<CalendarTestZone, { day: string; before: string; after: string }> = {
      'Europe/Zurich': { day: '2026-10-25', before: '2026-10-24', after: '2026-10-26' },
      'America/New_York': { day: '2026-11-01', before: '2026-10-31', after: '2026-11-02' },
      'Asia/Kolkata': { day: '2026-11-01', before: '2026-10-31', after: '2026-11-02' },
      'Pacific/Auckland': { day: '2026-04-05', before: '2026-04-04', after: '2026-04-06' },
    };

    for (const zone of CALENDAR_TEST_ZONES) {
      describe(zone, () => {
        useTimeZone(zone);

        it('activates the configured zone', () => {
          expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
        });

        it.each(['2026-08-03', '2026-08-03T00:00:00Z', '2026-08-03T00:00:00'])(
          'raises engaged of the shift dated %s when work is added on grid date 2026-08-03',
          async (wireDate) => {
            shiftLoaderMock.shiftSchedules = [
              createMockShiftSchedule({ shiftId: 'shift-1', date: wireDate as unknown as Date, engaged: 2 }),
            ];
            const params: ScheduleCellParams = {
              clientId: 'client-1',
              date: new Date(2026, 7, 3),
              shiftId: 'shift-1',
              workTime: 480,
              startTime: '08:00:00',
              endTime: '16:00:00',
            };

            service.addWorkScheduleEntry(params, createMockWorkFilter());
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(shiftLoaderMock.shiftSchedules[0].engaged).toBe(3);
          },
        );

        it('reloads the day before and after a bulk-deleted entry on the autumn DST switch day', async () => {
          const dstSwitch = AUTUMN_DST_SWITCH[zone];
          const entries: DeleteWorkScheduleEntryParams[] = [
            {
              id: 'work-1',
              sourceId: 'work-1',
              clientId: 'client-1',
              date: parseCalendarDate(dstSwitch.day) as Date,
              entryId: 'shift-1',
              entryType: 0,
            },
          ];

          service.bulkDeleteWorkScheduleEntries(entries, createMockWorkFilter());
          await new Promise(resolve => setTimeout(resolve, 10));

          expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalledWith(
            expect.objectContaining({ startDate: dstSwitch.before, endDate: dstSwitch.after }),
          );
        });
      });
    }
  });

  describe('signal behavior', () => {
    it('should trigger shiftScheduleRefreshed signal after shift update', async () => {
      // Arrange
      const testDate = new Date('2025-01-15');
      testDate.setHours(0, 0, 0, 0);

      shiftLoaderMock.shiftSchedules = [
        createMockShiftSchedule({
          shiftId: 'shift-1',
          date: testDate,
          engaged: 2,
        }),
      ];

      const params: ScheduleCellParams = {
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
        workTime: 480,
        startTime: '08:00:00',
        endTime: '16:00:00',
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.addWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.shiftScheduleRefreshed()).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(service.shiftScheduleRefreshed()).toBe(false);
    });
  });
});
