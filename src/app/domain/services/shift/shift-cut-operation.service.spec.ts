/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { ShiftCutOperationService, CutByDateParams, CutByTimeParams, CutByWeekdaysParams, CutByStaffParams, CutByTaskParams, } from './shift-cut-operation.service';
import { Shift, ShiftStatus } from 'src/app/domain/models/shift-class';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { WorkTimeCalculationService } from '../work-time-calculation.service';

describe('ShiftCutOperationService', () => {
    let service: ShiftCutOperationService;
    let workTimeCalculator: any;

    beforeEach(() => {
        const workTimeCalculatorSpy = {
            calculateWorkTime: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                ShiftCutOperationService,
                {
                    provide: WorkTimeCalculationService,
                    useValue: workTimeCalculatorSpy,
                },
            ],
        });

        service = TestBed.inject(ShiftCutOperationService);
        workTimeCalculator = TestBed.inject(WorkTimeCalculationService) as any;
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
            // Arrange
            const selectedShift = new Shift();
            selectedShift.fromDate = new Date(2025, 0, 15);
            selectedShift.startShift = '08:00:00';
            selectedShift.endShift = '16:00:00';

            const cutTime = OwnTime.forTime('12', '0');

            const params: CutByTimeParams = {
                selectedShift,
                cutTime,
            };

            workTimeCalculator.calculateWorkTime.mockReturnValue(240);

            // Act
            const result = service.cutByTime(params);

            // Assert
            expect(result.originalShift.endShift).toBe('12:00:00');
            expect(result.originalShift.status).toBe(ShiftStatus.SplitShift);
            expect(result.newShift.startShift).toBe('16:00:00');
            expect(result.newShift.isNew).toBe(true);
        });

        it('should calculate work time for both shifts', () => {
            // Arrange
            const selectedShift = new Shift();
            selectedShift.fromDate = new Date(2025, 0, 15);
            selectedShift.startShift = '08:00:00';
            selectedShift.endShift = '16:00:00';

            const cutTime = OwnTime.forTime('12', '0');

            workTimeCalculator.calculateWorkTime.mockReturnValue(240);

            // Act
            const result = service.cutByTime({ selectedShift, cutTime });

            // Assert
            expect(workTimeCalculator.calculateWorkTime).toHaveBeenCalled();
            expect(result.originalShift.status).toBe(ShiftStatus.SplitShift);
        });

        describe('CuttingAfterMidnight', () => {
            // Arrange
            beforeEach(() => {
                workTimeCalculator.calculateWorkTime.mockReturnValue(240);
            });

            it('should set CuttingAfterMidnight=true when split AFTER midnight (22:00-06:00, cut at 02:00)', () => {
                // Arrange
                const selectedShift = new Shift();
                selectedShift.fromDate = new Date(2025, 0, 15);
                selectedShift.startShift = '22:00:00';
                selectedShift.endShift = '06:00:00';

                const cutTime = OwnTime.forTime('2', '0');

                // Act
                const result = service.cutByTime({ selectedShift, cutTime });

                // Assert
                expect(result.originalShift.cuttingAfterMidnight).toBe(false);
                expect(result.newShift.cuttingAfterMidnight).toBe(true);
                expect(new Date(result.newShift.fromDate!).getDate()).toBe(16);
            });

            it('should set CuttingAfterMidnight=false when split BEFORE midnight (22:00-06:00, cut at 23:00)', () => {
                // Arrange
                const selectedShift = new Shift();
                selectedShift.fromDate = new Date(2025, 0, 15);
                selectedShift.startShift = '22:00:00';
                selectedShift.endShift = '06:00:00';

                const cutTime = OwnTime.forTime('23', '0');

                // Act
                const result = service.cutByTime({ selectedShift, cutTime });

                // Assert
                expect(result.originalShift.cuttingAfterMidnight).toBe(false);
                expect(result.newShift.cuttingAfterMidnight).toBe(false);
            });

            it('should set CuttingAfterMidnight=false for daytime shift (08:00-16:00, cut at 12:00)', () => {
                // Arrange
                const selectedShift = new Shift();
                selectedShift.fromDate = new Date(2025, 0, 15);
                selectedShift.startShift = '08:00:00';
                selectedShift.endShift = '16:00:00';

                const cutTime = OwnTime.forTime('12', '0');

                // Act
                const result = service.cutByTime({ selectedShift, cutTime });

                // Assert
                expect(result.originalShift.cuttingAfterMidnight).toBe(false);
                expect(result.newShift.cuttingAfterMidnight).toBe(false);
                expect(new Date(result.newShift.fromDate!).getDate()).toBe(15);
            });

            it('should set CuttingAfterMidnight=true for longer night shift (20:00-08:00, cut at 06:00)', () => {
                // Arrange
                const selectedShift = new Shift();
                selectedShift.fromDate = new Date(2025, 0, 15);
                selectedShift.startShift = '20:00:00';
                selectedShift.endShift = '08:00:00';

                const cutTime = OwnTime.forTime('6', '0');

                // Act
                const result = service.cutByTime({ selectedShift, cutTime });

                // Assert
                expect(result.originalShift.cuttingAfterMidnight).toBe(false);
                expect(result.newShift.cuttingAfterMidnight).toBe(true);
                expect(new Date(result.newShift.fromDate!).getDate()).toBe(16);
            });

            it('should set CuttingAfterMidnight=true for short night shift (22:00-04:00, cut at 02:00)', () => {
                // Arrange
                const selectedShift = new Shift();
                selectedShift.fromDate = new Date(2025, 0, 15);
                selectedShift.startShift = '22:00:00';
                selectedShift.endShift = '04:00:00';

                const cutTime = OwnTime.forTime('2', '0');

                // Act
                const result = service.cutByTime({ selectedShift, cutTime });

                // Assert
                expect(result.originalShift.cuttingAfterMidnight).toBe(false);
                expect(result.newShift.cuttingAfterMidnight).toBe(true);
                expect(new Date(result.newShift.fromDate!).getDate()).toBe(16);
            });

            it('should NOT set CuttingAfterMidnight=true when cut time exceeds original end (22:00-04:00, cut at 05:00 is invalid scenario)', () => {
                // Arrange
                const selectedShift = new Shift();
                selectedShift.fromDate = new Date(2025, 0, 15);
                selectedShift.startShift = '22:00:00';
                selectedShift.endShift = '04:00:00';

                const cutTime = OwnTime.forTime('5', '0');

                // Act
                const result = service.cutByTime({ selectedShift, cutTime });

                // Assert
                expect(result.newShift.cuttingAfterMidnight).toBe(false);
            });
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
});
