import { TestBed } from '@angular/core/testing';
import {
  ShiftCutOperationService,
  CutByDateParams,
  CutByTimeParams,
  CutByWeekdaysParams,
  CutByStaffParams,
  CutByTaskParams,
} from './shift-cut-operation.service';
import { Shift, ShiftStatus } from 'src/app/domain/models/shift-class';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { WorkTimeCalculationService } from '../work-time-calculation.service';

describe('ShiftCutOperationService', () => {
  let service: ShiftCutOperationService;
  let workTimeCalculator: jasmine.SpyObj<WorkTimeCalculationService>;

  beforeEach(() => {
    const workTimeCalculatorSpy = jasmine.createSpyObj(
      'WorkTimeCalculationService',
      ['calculateWorkTime']
    );

    TestBed.configureTestingModule({
      providers: [
        ShiftCutOperationService,
        { provide: WorkTimeCalculationService, useValue: workTimeCalculatorSpy },
      ],
    });

    service = TestBed.inject(ShiftCutOperationService);
    workTimeCalculator = TestBed.inject(
      WorkTimeCalculationService
    ) as jasmine.SpyObj<WorkTimeCalculationService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('cutByDate', () => {
    it('should split shift by date correctly', () => {
      const selectedShift = new Shift();
      selectedShift.fromDate = new Date(2025, 0, 1);
      selectedShift.untilDate = new Date(2025, 0, 31);
      selectedShift.status = ShiftStatus.OriginalShift;

      const cutDate = new Date(2025, 0, 15);

      const params: CutByDateParams = {
        selectedShift,
        cutDate,
      };

      const result = service.cutByDate(params);

      expect(result.originalShift.untilDate).toEqual(new Date(2025, 0, 14));
      expect(result.originalShift.status).toBe(ShiftStatus.SplitShift);
      expect(result.newShift.fromDate).toEqual(cutDate);
      expect(result.newShift.isNew).toBe(true);
    });

    it('should set untilDate to day before cut date', () => {
      const selectedShift = new Shift();
      selectedShift.fromDate = new Date(2025, 0, 1);
      selectedShift.untilDate = new Date(2025, 0, 31);

      const cutDate = new Date(2025, 0, 20);

      const result = service.cutByDate({ selectedShift, cutDate });

      const expectedUntilDate = new Date(2025, 0, 19);
      expect(result.originalShift.untilDate).toEqual(expectedUntilDate);
    });
  });

  describe('cutByTime', () => {
    it('should split shift by time correctly', () => {
      const selectedShift = new Shift();
      selectedShift.fromDate = new Date(2025, 0, 15);
      selectedShift.startShift = '08:00:00';
      selectedShift.endShift = '16:00:00';
      selectedShift.internalStartShift = OwnTime.forTime('8', '0');
      selectedShift.internalEndShift = OwnTime.forTime('16', '0');

      const cutTime = OwnTime.forTime('12', '0');

      const params: CutByTimeParams = {
        selectedShift,
        cutTime,
      };

      workTimeCalculator.calculateWorkTime.and.returnValue(240);

      const result = service.cutByTime(params);

      expect(result.originalShift.endShift).toBe('12:00:00');
      expect(result.originalShift.status).toBe(ShiftStatus.SplitShift);
      expect(result.newShift.startShift).toBe('16:00:00');
      expect(result.newShift.isNew).toBe(true);
    });

    it('should calculate work time for both shifts', () => {
      const selectedShift = new Shift();
      selectedShift.fromDate = new Date(2025, 0, 15);
      selectedShift.startShift = '08:00:00';
      selectedShift.endShift = '16:00:00';
      selectedShift.internalStartShift = OwnTime.forTime('8', '0');
      selectedShift.internalEndShift = OwnTime.forTime('16', '0');

      const cutTime = OwnTime.forTime('12', '0');

      workTimeCalculator.calculateWorkTime.and.returnValue(240);

      const result = service.cutByTime({ selectedShift, cutTime });

      expect(workTimeCalculator.calculateWorkTime).toHaveBeenCalled();
      expect(result.originalShift.status).toBe(ShiftStatus.SplitShift);
    });
  });

  describe('cutByWeekdays', () => {
    it('should split shift by weekdays correctly', () => {
      const selectedShift = new Shift();
      selectedShift.isMonday = true;
      selectedShift.isTuesday = true;
      selectedShift.isWednesday = true;
      selectedShift.isThursday = true;
      selectedShift.isFriday = true;
      selectedShift.isSaturday = false;
      selectedShift.isSunday = false;

      const weekdays = {
        isMonday: true,
        isTuesday: false,
        isWednesday: true,
        isThursday: false,
        isFriday: true,
        isSaturday: false,
        isSunday: false,
      };

      const params: CutByWeekdaysParams = {
        selectedShift,
        weekdays,
      };

      const result = service.cutByWeekdays(params);

      expect(result.originalShift.isMonday).toBe(false);
      expect(result.originalShift.isTuesday).toBe(true);
      expect(result.originalShift.isWednesday).toBe(false);
      expect(result.originalShift.isThursday).toBe(true);
      expect(result.originalShift.isFriday).toBe(false);

      expect(result.newShift.isMonday).toBe(true);
      expect(result.newShift.isTuesday).toBe(false);
      expect(result.newShift.isWednesday).toBe(true);
      expect(result.newShift.isThursday).toBe(false);
      expect(result.newShift.isFriday).toBe(true);

      expect(result.originalShift.status).toBe(ShiftStatus.SplitShift);
    });
  });

  describe('cutByStaff', () => {
    it('should split shift by staff count correctly', () => {
      const selectedShift = new Shift();
      selectedShift.sumEmployees = 10;

      const params: CutByStaffParams = {
        selectedShift,
        staffCount: 3,
      };

      const result = service.cutByStaff(params);

      expect(result.originalShift.sumEmployees).toBe(7);
      expect(result.newShift.sumEmployees).toBe(3);
      expect(result.originalShift.status).toBe(ShiftStatus.SplitShift);
      expect(result.newShift.isNew).toBe(true);
    });

    it('should handle zero staff count', () => {
      const selectedShift = new Shift();
      selectedShift.sumEmployees = 5;

      const result = service.cutByStaff({ selectedShift, staffCount: 0 });

      expect(result.originalShift.sumEmployees).toBe(5);
      expect(result.newShift.sumEmployees).toBe(0);
    });
  });

  describe('cutByTask', () => {
    it('should split shift by task count correctly', () => {
      const selectedShift = new Shift();
      selectedShift.quantity = 100;

      const params: CutByTaskParams = {
        selectedShift,
        taskCount: 30,
      };

      const result = service.cutByTask(params);

      expect(result.originalShift.quantity).toBe(70);
      expect(result.newShift.quantity).toBe(30);
      expect(result.originalShift.status).toBe(ShiftStatus.SplitShift);
      expect(result.newShift.isNew).toBe(true);
    });

    it('should handle zero task count', () => {
      const selectedShift = new Shift();
      selectedShift.quantity = 50;

      const result = service.cutByTask({ selectedShift, taskCount: 0 });

      expect(result.originalShift.quantity).toBe(50);
      expect(result.newShift.quantity).toBe(0);
    });
  });

  describe('ensureDateSync', () => {
    it('should sync fromDate to internalFromDate', () => {
      const shift = new Shift();
      shift.fromDate = new Date(2025, 0, 15);

      const result = service['ensureDateSync'](shift);

      expect(shift.internalFromDate).toBeDefined();
      expect(shift.internalFromDate?.year).toBe(2025);
      expect(shift.internalFromDate?.month).toBe(1);
      expect(shift.internalFromDate?.day).toBe(15);
    });

    it('should sync internalFromDate to fromDate', () => {
      const shift = new Shift();
      shift.internalFromDate = { year: 2025, month: 1, day: 15 };

      const result = service['ensureDateSync'](shift);

      expect(shift.fromDate).toBeDefined();
      expect(shift.fromDate?.getFullYear()).toBe(2025);
      expect(shift.fromDate?.getMonth()).toBe(0);
      expect(shift.fromDate?.getDate()).toBe(15);
    });
  });
});
