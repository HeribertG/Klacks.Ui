import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkNotificationService } from './work-notification.service';
import { SignalRService } from '../../../infrastructure/signalr/signalr.service';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import { IWorkNotification } from '../../interfaces/work-notification.interface';
import { IShiftStatsNotification } from '../../interfaces/shift-stats-notification.interface';

describe('WorkNotificationService', () => {
  let service: WorkNotificationService;
  let dataManagementMock: {
    readShiftSchedule: ReturnType<typeof vi.fn>;
    refreshClientScheduleForDays: ReturnType<typeof vi.fn>;
    refreshClientScheduleForDateRange: ReturnType<typeof vi.fn>;
    clients: { id: string; name: string; neededRows: number }[];
    currentFilter: unknown;
  };

  let shiftScheduleLoaderMock: {
    updateShiftEngaged: ReturnType<typeof vi.fn>;
    shiftSchedules: unknown[];
  };

  let availableShiftsCalcMock: {
    calculate: ReturnType<typeof vi.fn>;
  };

  let workCreated$: Subject<IWorkNotification>;
  let workUpdated$: Subject<IWorkNotification>;
  let workDeleted$: Subject<IWorkNotification>;
  let shiftStatsUpdated$: Subject<IShiftStatsNotification>;

  beforeEach(() => {
    // Arrange
    workCreated$ = new Subject<IWorkNotification>();
    workUpdated$ = new Subject<IWorkNotification>();
    workDeleted$ = new Subject<IWorkNotification>();
    shiftStatsUpdated$ = new Subject<IShiftStatsNotification>();
    const scheduleUpdated$ = new Subject<unknown>();

    const signalRServiceMock = {
      workCreated$: workCreated$.asObservable(),
      workUpdated$: workUpdated$.asObservable(),
      workDeleted$: workDeleted$.asObservable(),
      shiftStatsUpdated$: shiftStatsUpdated$.asObservable(),
      scheduleUpdated$: scheduleUpdated$.asObservable(),
    };

    dataManagementMock = {
      readShiftSchedule: vi.fn(),
      refreshClientScheduleForDays: vi.fn(),
      refreshClientScheduleForDateRange: vi.fn(),
      clients: [{ id: 'client-1', name: 'Test Client', neededRows: 1 }],
      currentFilter: {},
    };

    shiftScheduleLoaderMock = {
      updateShiftEngaged: vi.fn().mockReturnValue(false),
      shiftSchedules: [],
    };

    availableShiftsCalcMock = {
      calculate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        WorkNotificationService,
        { provide: SignalRService, useValue: signalRServiceMock },
        { provide: DataManagementScheduleService, useValue: dataManagementMock },
        { provide: ShiftScheduleLoaderService, useValue: shiftScheduleLoaderMock },
        { provide: AvailableShiftsCalculatorService, useValue: availableShiftsCalcMock },
      ],
    });

    service = TestBed.inject(WorkNotificationService);
  });

  afterEach(() => {
    workCreated$.complete();
    workUpdated$.complete();
    workDeleted$.complete();
    shiftStatsUpdated$.complete();
  });

  describe('handleWorkNotification', () => {
    it('should call refreshClientScheduleForDateRange when WorkCreated notification is received for displayed client', async () => {
      // Arrange
      const notification: IWorkNotification = {
        workId: 'work-1',
        clientId: 'client-1',
        shiftId: 'shift-1',
        currentDate: new Date(),
        operationType: 'created',
        sourceConnectionId: 'other-connection',
      };

      // Act
      workCreated$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Assert
      expect(dataManagementMock.refreshClientScheduleForDateRange).toHaveBeenCalled();
    });

    it('should call refreshClientScheduleForDateRange when WorkUpdated notification is received for displayed client', async () => {
      // Arrange
      const notification: IWorkNotification = {
        workId: 'work-1',
        clientId: 'client-1',
        shiftId: 'shift-1',
        currentDate: new Date(),
        operationType: 'updated',
        sourceConnectionId: 'other-connection',
      };

      // Act
      workUpdated$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Assert
      expect(dataManagementMock.refreshClientScheduleForDateRange).toHaveBeenCalled();
    });

    it('should call refreshClientScheduleForDateRange when WorkDeleted notification is received for displayed client', async () => {
      // Arrange
      const notification: IWorkNotification = {
        workId: 'work-1',
        clientId: 'client-1',
        shiftId: 'shift-1',
        currentDate: new Date(),
        operationType: 'deleted',
        sourceConnectionId: 'other-connection',
      };

      // Act
      workDeleted$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Assert
      expect(dataManagementMock.refreshClientScheduleForDateRange).toHaveBeenCalled();
    });

    it('should refresh client schedule when client is displayed', async () => {
      // Arrange
      const notification: IWorkNotification = {
        workId: 'work-1',
        clientId: 'client-1',
        shiftId: 'shift-1',
        currentDate: new Date('2025-01-15'),
        operationType: 'created',
        sourceConnectionId: 'other-connection',
      };

      // Act
      workCreated$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Assert
      expect(dataManagementMock.refreshClientScheduleForDateRange).toHaveBeenCalledWith(
        'client-1',
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should NOT refresh client schedule when client is not displayed', async () => {
      // Arrange
      const notification: IWorkNotification = {
        workId: 'work-1',
        clientId: 'unknown-client',
        shiftId: 'shift-1',
        currentDate: new Date('2025-01-15'),
        operationType: 'created',
        sourceConnectionId: 'other-connection',
      };

      // Act
      workCreated$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Assert
      expect(dataManagementMock.refreshClientScheduleForDateRange).not.toHaveBeenCalled();
    });

    it('should mark shift as affected after notification', async () => {
      // Arrange
      const notification: IWorkNotification = {
        workId: 'work-1',
        clientId: 'client-1',
        shiftId: 'shift-123',
        currentDate: new Date(),
        operationType: 'created',
        sourceConnectionId: 'other-connection',
      };

      // Act
      workCreated$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.isShiftAffected('shift-123')).toBe(true);
    });

    it('should update scheduleUpdateSignal when client is displayed', async () => {
      // Arrange
      const notification: IWorkNotification = {
        workId: 'work-123',
        clientId: 'client-1',
        shiftId: 'shift-1',
        currentDate: new Date(),
        operationType: 'created',
        sourceConnectionId: 'other-connection',
      };

      // Act
      workCreated$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.scheduleUpdateSignal()).toBe('work-123');

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(service.scheduleUpdateSignal()).toBeNull();
    });

    it('should update shiftUpdateSignal after notification', async () => {
      // Arrange
      const notification: IWorkNotification = {
        workId: 'work-1',
        clientId: 'client-1',
        shiftId: 'shift-456',
        currentDate: new Date(),
        operationType: 'created',
        sourceConnectionId: 'other-connection',
      };

      // Act
      workCreated$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.shiftUpdateSignal()).toBe('shift-456');

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(service.shiftUpdateSignal()).toBeNull();
    });
  });

  describe('handleShiftStatsNotification', () => {
    it('should update shift stats when notification is received', async () => {
      // Arrange
      shiftScheduleLoaderMock.updateShiftEngaged.mockReturnValue(true);
      const notification: IShiftStatsNotification = {
        shiftId: 'shift-1',
        date: new Date(),
        engaged: 5,
        sourceConnectionId: 'other-connection',
      };

      // Act
      shiftStatsUpdated$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(shiftScheduleLoaderMock.updateShiftEngaged).toHaveBeenCalledWith(
        'shift-1',
        expect.any(Date),
        5
      );
    });

    it('should recalculate available shifts when update is successful', async () => {
      // Arrange
      shiftScheduleLoaderMock.updateShiftEngaged.mockReturnValue(true);
      const notification: IShiftStatsNotification = {
        shiftId: 'shift-1',
        date: new Date(),
        engaged: 5,
        sourceConnectionId: 'other-connection',
      };

      // Act
      shiftStatsUpdated$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(availableShiftsCalcMock.calculate).toHaveBeenCalled();
    });

    it('should NOT recalculate available shifts when update returns false', async () => {
      // Arrange
      shiftScheduleLoaderMock.updateShiftEngaged.mockReturnValue(false);
      const notification: IShiftStatsNotification = {
        shiftId: 'shift-1',
        date: new Date(),
        engaged: 5,
        sourceConnectionId: 'other-connection',
      };

      // Act
      shiftStatsUpdated$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(availableShiftsCalcMock.calculate).not.toHaveBeenCalled();
    });
  });

  describe('clearAffectedShifts', () => {
    it('should clear all affected shifts', async () => {
      // Arrange
      const notification: IWorkNotification = {
        workId: 'work-1',
        clientId: 'client-1',
        shiftId: 'shift-1',
        currentDate: new Date(),
        operationType: 'created',
        sourceConnectionId: 'other-connection',
      };
      workCreated$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(service.isShiftAffected('shift-1')).toBe(true);

      // Act
      service.clearAffectedShifts();

      // Assert
      expect(service.isShiftAffected('shift-1')).toBe(false);
    });
  });

  describe('multiple notifications', () => {
    it('should accumulate affected shifts from multiple notifications', async () => {
      // Arrange
      const notification1: IWorkNotification = {
        workId: 'work-1',
        clientId: 'client-1',
        shiftId: 'shift-1',
        currentDate: new Date(),
        operationType: 'created',
        sourceConnectionId: 'other-connection',
      };
      const notification2: IWorkNotification = {
        workId: 'work-2',
        clientId: 'client-1',
        shiftId: 'shift-2',
        currentDate: new Date(),
        operationType: 'created',
        sourceConnectionId: 'other-connection',
      };

      // Act
      workCreated$.next(notification1);
      await new Promise(resolve => setTimeout(resolve, 150));
      workCreated$.next(notification2);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.isShiftAffected('shift-1')).toBe(true);
      expect(service.isShiftAffected('shift-2')).toBe(true);
    });

    it('should handle multiple notifications from different sources', async () => {
      // Arrange
      const notification1: IWorkNotification = {
        workId: 'work-1',
        clientId: 'client-1',
        shiftId: 'shift-1',
        currentDate: new Date(),
        operationType: 'created',
        sourceConnectionId: 'other-connection',
      };
      const notification2: IWorkNotification = {
        workId: 'work-2',
        clientId: 'client-1',
        shiftId: 'shift-2',
        currentDate: new Date(),
        operationType: 'updated',
        sourceConnectionId: 'other-connection',
      };

      // Act
      workCreated$.next(notification1);
      workUpdated$.next(notification2);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.isShiftAffected('shift-1')).toBe(true);
      expect(service.isShiftAffected('shift-2')).toBe(true);
    });
  });
});
