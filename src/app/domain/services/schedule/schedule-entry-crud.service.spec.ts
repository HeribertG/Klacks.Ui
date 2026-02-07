import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
import { IShiftSchedule } from '../../models/shift-schedule-class';
import { ShiftSporadic } from '../../enums/shift-sporadic.enum';
import { IWorkFilter } from '../../models/schedule-class';
import { DataManagementBreakService } from '../break/data-management-break.service';
import { DataWorkChangeService } from 'src/app/infrastructure/api/workchange/data-work-change.service';

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
    hoursSortOrder: undefined,
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
    engaged: 2,
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
  };

  let workCrudMock: {
    createWork: ReturnType<typeof vi.fn>;
    deleteWorkById: ReturnType<typeof vi.fn>;
    bulkDeleteWorks: ReturnType<typeof vi.fn>;
    bulkCreateWorks: ReturnType<typeof vi.fn>;
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
    };

    workCrudMock = {
      createWork: vi.fn().mockResolvedValue({ id: 'new-work-id', scheduleEntries: [{ clientId: 'client-1' }] }),
      deleteWorkById: vi.fn().mockResolvedValue({ scheduleEntries: [{ clientId: 'client-1' }] }),
      bulkDeleteWorks: vi.fn().mockResolvedValue({
        successCount: 0,
        failedCount: 0,
        deletedIds: [],
        affectedShifts: [],
      }),
      bulkCreateWorks: vi.fn().mockResolvedValue({ periodHours: {} }),
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

    TestBed.configureTestingModule({
      providers: [
        ScheduleEntryCrudService,
        { provide: DataWorkScheduleService, useValue: dataWorkScheduleMock },
        { provide: DataWorkChangeService, useValue: workChangeServiceMock },
        { provide: ShiftScheduleLoaderService, useValue: shiftLoaderMock },
        { provide: WorkScheduleLoaderService, useValue: workScheduleLoaderMock },
        { provide: DataManagementWorkService, useValue: workCrudMock },
        { provide: AvailableShiftsCalculatorService, useValue: availableShiftsCalcMock },
        { provide: DataManagementBreakService, useValue: breakServiceMock },
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
      expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalledTimes(2);
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
      expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalledTimes(2);
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
