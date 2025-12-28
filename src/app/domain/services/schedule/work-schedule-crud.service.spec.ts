import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WorkScheduleCrudService,
  WorkScheduleEntryParams,
  DeleteWorkScheduleEntryParams,
} from './work-schedule-crud.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/data-work-schedule.service';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';
import { WorkScheduleLoaderService } from './work-schedule-loader.service';
import { WorkCrudService } from './work-crud.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import { IShiftSchedule } from '../../models/shift-schedule-class';
import { ShiftSporadic } from '../../enums/shift-sporadic.enum';
import { IWorkFilter } from '../../models/schedule-class';

function createMockWorkFilter(): IWorkFilter {
  return {
    dayVisibleBeforeMonth: 10,
    dayVisibleAfterMonth: 10,
    currentMonth: 1,
    currentYear: 2025,
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

describe('WorkScheduleCrudService', () => {
  let service: WorkScheduleCrudService;

  let dataWorkScheduleMock: {
    getWorkSchedule: ReturnType<typeof vi.fn>;
  };

  let shiftLoaderMock: {
    shiftSchedules: IShiftSchedule[];
  };

  let workScheduleLoaderMock: {
    replaceClientEntriesForDays: ReturnType<typeof vi.fn>;
    updateClientNeededRows: ReturnType<typeof vi.fn>;
  };

  let workCrudMock: {
    createWork: ReturnType<typeof vi.fn>;
    deleteWorkById: ReturnType<typeof vi.fn>;
    bulkDeleteWorks: ReturnType<typeof vi.fn>;
  };

  let availableShiftsCalcMock: {
    calculate: ReturnType<typeof vi.fn>;
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
    };

    workCrudMock = {
      createWork: vi.fn().mockResolvedValue({ id: 'new-work-id' }),
      deleteWorkById: vi.fn().mockResolvedValue(undefined),
      bulkDeleteWorks: vi.fn().mockResolvedValue({
        successCount: 0,
        failedCount: 0,
        deletedIds: [],
        affectedShifts: [],
      }),
    };

    availableShiftsCalcMock = {
      calculate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        WorkScheduleCrudService,
        { provide: DataWorkScheduleService, useValue: dataWorkScheduleMock },
        { provide: ShiftScheduleLoaderService, useValue: shiftLoaderMock },
        { provide: WorkScheduleLoaderService, useValue: workScheduleLoaderMock },
        { provide: WorkCrudService, useValue: workCrudMock },
        { provide: AvailableShiftsCalculatorService, useValue: availableShiftsCalcMock },
      ],
    });

    service = TestBed.inject(WorkScheduleCrudService);
  });

  describe('addWorkScheduleEntry', () => {
    it('should call createWork with correct params', async () => {
      // Arrange
      const params: WorkScheduleEntryParams = {
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
        workTime: 480,
        startShift: '08:00:00',
        endShift: '16:00:00',
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.addWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(workCrudMock.createWork).toHaveBeenCalledWith(params);
    });

    it('should refresh client schedule after adding work', async () => {
      // Arrange
      const params: WorkScheduleEntryParams = {
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
        workTime: 480,
        startShift: '08:00:00',
        endShift: '16:00:00',
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.addWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalled();
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

      const params: WorkScheduleEntryParams = {
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
        workTime: 480,
        startShift: '08:00:00',
        endShift: '16:00:00',
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
      const params: WorkScheduleEntryParams = {
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
        workTime: 480,
        startShift: '08:00:00',
        endShift: '16:00:00',
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
        workId: 'work-123',
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.deleteWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(workCrudMock.deleteWorkById).toHaveBeenCalledWith('work-123');
    });

    it('should refresh client schedule after deleting work', async () => {
      // Arrange
      const params: DeleteWorkScheduleEntryParams = {
        workId: 'work-123',
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.deleteWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(dataWorkScheduleMock.getWorkSchedule).toHaveBeenCalled();
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
        workId: 'work-123',
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
      };
      const workFilter = createMockWorkFilter();

      // Act
      service.deleteWorkScheduleEntry(params, workFilter);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
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
        workId: 'work-123',
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
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
        { workId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), shiftId: 'shift-1' },
        { workId: 'work-2', clientId: 'client-1', date: new Date('2025-01-16'), shiftId: 'shift-1' },
        { workId: 'work-3', clientId: 'client-2', date: new Date('2025-01-15'), shiftId: 'shift-2' },
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

    it('should not refresh when successCount is zero', async () => {
      // Arrange
      const entries: DeleteWorkScheduleEntryParams[] = [
        { workId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), shiftId: 'shift-1' },
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
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(dataWorkScheduleMock.getWorkSchedule).not.toHaveBeenCalled();
    });

    it('should refresh schedule for each affected client', async () => {
      // Arrange
      const entries: DeleteWorkScheduleEntryParams[] = [
        { workId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), shiftId: 'shift-1' },
        { workId: 'work-2', clientId: 'client-2', date: new Date('2025-01-16'), shiftId: 'shift-2' },
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
        { workId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), shiftId: 'shift-1' },
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
        { workId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), shiftId: 'shift-1' },
        { workId: 'work-2', clientId: 'client-2', date: new Date('2025-01-15'), shiftId: 'shift-1' },
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
        { workId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), shiftId: 'shift-1' },
        { workId: 'work-2', clientId: 'client-1', date: new Date('2025-01-16'), shiftId: 'shift-1' },
        { workId: 'work-3', clientId: 'client-1', date: new Date('2025-01-17'), shiftId: 'shift-1' },
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
        { workId: 'work-1', clientId: 'client-1', date: new Date('2025-01-13'), shiftId: 'shift-1' },
        { workId: 'work-2', clientId: 'client-1', date: new Date('2025-01-14'), shiftId: 'shift-1' },
        { workId: 'work-3', clientId: 'client-1', date: new Date('2025-01-15'), shiftId: 'shift-1' },
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
        { workId: 'work-1', clientId: 'client-1', date: new Date('2025-01-10'), shiftId: 'shift-1' },
        { workId: 'work-2', clientId: 'client-1', date: new Date('2025-01-20'), shiftId: 'shift-1' },
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
        { workId: 'work-1', clientId: 'client-1', date: new Date('2025-01-15'), shiftId: 'shift-1' },
        { workId: 'work-2', clientId: 'client-1', date: new Date('2025-01-15'), shiftId: 'shift-2' },
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

      const params: WorkScheduleEntryParams = {
        clientId: 'client-1',
        date: new Date('2025-01-15'),
        shiftId: 'shift-1',
        workTime: 480,
        startShift: '08:00:00',
        endShift: '16:00:00',
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
