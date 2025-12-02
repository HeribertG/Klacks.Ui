import { TestBed } from '@angular/core/testing';
import { WorkTimeCalculationService } from './work-time-calculation.service';
import { OwnTime } from 'src/app/domain/models/schedule-class';

describe('WorkTimeCalculationService', () => {
    let service: WorkTimeCalculationService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(WorkTimeCalculationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('calculateWorkTime', () => {
        it('should calculate normal shift correctly: 08:00-16:00 → Start: 8×60=480min, End: 16×60=960min, Result: 960-480=480min=8.0h', () => {
            const start = OwnTime.forTime('8', '0');
            const end = OwnTime.forTime('16', '0');
            const result = service.calculateWorkTime(start, end);
            expect(result).toBe(8.0);
        });

        it('should calculate overnight shift correctly: 22:00-06:00 → Start: 22×60=1320min, End: 6×60=360min, Result: (24×60-1320)+360=120+360=480min=8.0h', () => {
            const start = OwnTime.forTime('22', '0');
            const end = OwnTime.forTime('6', '0');
            const result = service.calculateWorkTime(start, end);
            expect(result).toBe(8.0);
        });

        it('should calculate 24-hour shift correctly: 07:00-07:00 → Start: 7×60=420min, End: 7×60=420min, Same time → 24×60=1440min=24.0h', () => {
            const start = OwnTime.forTime('7', '0');
            const end = OwnTime.forTime('7', '0');
            const result = service.calculateWorkTime(start, end);
            expect(result).toBe(24.0);
        });

        it('should calculate shift with minutes correctly: 09:30-17:45 → Start: 9×60+30=570min, End: 17×60+45=1065min, Result: 1065-570=495min=8.25h=8:15', () => {
            const start = OwnTime.forTime('9', '30');
            const end = OwnTime.forTime('17', '45');
            const result = service.calculateWorkTime(start, end);
            expect(result).toBe(8.25);
        });

        it('should return 0 for invalid input', () => {
            const result = service.calculateWorkTime(undefined, undefined);

            expect(result).toBe(0);
        });
    });

    describe('calculateWorkTimeWithFallback', () => {
        it('should use automatic calculation when start and end are provided', () => {
            const start = OwnTime.forTime('9', '0');
            const end = OwnTime.forTime('17', '0');
            const manual = OwnTime.forTime('10', '0'); // Should be ignored

            const result = service.calculateWorkTimeWithFallback(start, end, manual);

            expect(result).toBe(8.0); // Uses automatic calculation, ignores manual
        });

        it('should fallback to manual workTime when start/end are invalid', () => {
            const manual = OwnTime.forTime('6', '30'); // 6.5 hours

            const result = service.calculateWorkTimeWithFallback(undefined, undefined, manual);

            expect(result).toBe(6.5); // Uses manual workTime
        });

        it('should return 0 when all inputs are invalid', () => {
            const result = service.calculateWorkTimeWithFallback(undefined, undefined, undefined);

            expect(result).toBe(0);
        });
    });

    describe('isValidTimeSpan', () => {
        it('should return true for valid normal shift', () => {
            const start = OwnTime.forTime('8', '0');
            const end = OwnTime.forTime('16', '0');

            const result = service.isValidTimeSpan(start, end);

            expect(result).toBe(true);
        });

        it('should return true for valid overnight shift', () => {
            const start = OwnTime.forTime('22', '0');
            const end = OwnTime.forTime('6', '0');

            const result = service.isValidTimeSpan(start, end);

            expect(result).toBe(true);
        });

        it('should return true for 24-hour shift', () => {
            const start = OwnTime.forTime('7', '0');
            const end = OwnTime.forTime('7', '0');

            const result = service.isValidTimeSpan(start, end);

            expect(result).toBe(true);
        });

        it('should return false for invalid input', () => {
            const result = service.isValidTimeSpan(undefined, undefined);

            expect(result).toBe(false);
        });
    });

    describe('formatWorkTimeForDisplay', () => {
        it('should format whole hours correctly', () => {
            const result = service.formatWorkTimeForDisplay(8.0);

            expect(result).toBe('8:00');
        });

        it('should format hours with minutes correctly', () => {
            const result = service.formatWorkTimeForDisplay(8.25);

            expect(result).toBe('8:15');
        });

        it('should format half hours correctly', () => {
            const result = service.formatWorkTimeForDisplay(7.5);

            expect(result).toBe('7:30');
        });

        it('should handle zero correctly', () => {
            const result = service.formatWorkTimeForDisplay(0);

            expect(result).toBe('0:00');
        });
    });

    describe('Real-world scenarios', () => {
        it('Database Fix: 07:00-15:00 → 8.0h (was 24h), 15:00-23:00 → 8.0h (was 0.4h), 23:00-07:00 → 8.0h (was 0.4h)', () => {
            // Original shift: 07:00-15:00 (should be 8 hours)
            const shift1Start = OwnTime.forTime('7', '0');
            const shift1End = OwnTime.forTime('15', '0');
            const result1 = service.calculateWorkTime(shift1Start, shift1End);
            expect(result1).toBe(8.0);

            // Cut shift: 15:00-23:00 (should be 8 hours)
            const shift2Start = OwnTime.forTime('15', '0');
            const shift2End = OwnTime.forTime('23', '0');
            const result2 = service.calculateWorkTime(shift2Start, shift2End);
            expect(result2).toBe(8.0);

            // Overnight cut: 23:00-07:00 (should be 8 hours)
            const shift3Start = OwnTime.forTime('23', '0');
            const shift3End = OwnTime.forTime('7', '0');
            const result3 = service.calculateWorkTime(shift3Start, shift3End);
            expect(result3).toBe(8.0);
        });
    });
});
