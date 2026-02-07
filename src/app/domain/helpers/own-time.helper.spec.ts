import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import {
    isOwnTimeStructOk,
    transformStringToOwnTimeStruct,
    transformOwnTimeToString,
    transformOwnTimeToNumber,
    transformNumberToOwnTime,
} from './own-time.helper';

describe('OwnTime Helper', () => {
    describe('transformNumberToOwnTime (Dezimal-Stunden → OwnTime)', () => {
        it('should convert 160 hours to OwnTime', () => {
            // Arrange
            const decimalHours = 160;

            // Act
            const result = transformNumberToOwnTime(decimalHours, true);

            // Assert
            expect(result.hours).toBe('160');
            expect(result.minutes).toBe('00');
        });

        it('should convert 160.5 hours (160h 30min) to OwnTime', () => {
            // Arrange
            const decimalHours = 160.5;

            // Act
            const result = transformNumberToOwnTime(decimalHours, true);

            // Assert
            expect(result.hours).toBe('160');
            expect(result.minutes).toBe('30');
        });

        it('should convert 80.25 hours (80h 15min) to OwnTime', () => {
            // Arrange
            const decimalHours = 80.25;

            // Act
            const result = transformNumberToOwnTime(decimalHours, true);

            // Assert
            expect(result.hours).toBe('80');
            expect(result.minutes).toBe('15');
        });

        it('should convert 40.75 hours (40h 45min) to OwnTime', () => {
            // Arrange
            const decimalHours = 40.75;

            // Act
            const result = transformNumberToOwnTime(decimalHours, true);

            // Assert
            expect(result.hours).toBe('40');
            expect(result.minutes).toBe('45');
        });

        it('should convert 8.5 hours (8h 30min) to OwnTime', () => {
            // Arrange
            const decimalHours = 8.5;

            // Act
            const result = transformNumberToOwnTime(decimalHours, true);

            // Assert
            expect(result.hours).toBe('08');
            expect(result.minutes).toBe('30');
        });

        it('should handle 0 and return 00:00', () => {
            // Arrange
            const decimalHours = 0;

            // Act
            const result = transformNumberToOwnTime(decimalHours, true);

            // Assert
            expect(result.hours).toBe('00');
            expect(result.minutes).toBe('00');
        });

        it('should round minutes correctly for 1.333... (1h 20min)', () => {
            // Arrange
            const decimalHours = 1 + 20 / 60; // 1.3333...

            // Act
            const result = transformNumberToOwnTime(decimalHours, true);

            // Assert
            expect(result.hours).toBe('01');
            expect(result.minutes).toBe('20');
        });

        it('should round minutes correctly for 2.1666... (2h 10min)', () => {
            // Arrange
            const decimalHours = 2 + 10 / 60; // 2.1666...

            // Act
            const result = transformNumberToOwnTime(decimalHours, true);

            // Assert
            expect(result.hours).toBe('02');
            expect(result.minutes).toBe('10');
        });
    });

    describe('transformOwnTimeToNumber (OwnTime → Dezimal-Stunden)', () => {
        it('should convert 160:00 to 160', () => {
            // Arrange
            const ownTime = new OwnTime('160', '0', true);

            // Act
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBe(160);
        });

        it('should convert 160:30 to 160.5', () => {
            // Arrange
            const ownTime = new OwnTime('160', '30', true);

            // Act
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBe(160.5);
        });

        it('should convert 80:15 to 80.25', () => {
            // Arrange
            const ownTime = new OwnTime('80', '15', true);

            // Act
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBe(80.25);
        });

        it('should convert 40:45 to 40.75', () => {
            // Arrange
            const ownTime = new OwnTime('40', '45', true);

            // Act
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBe(40.75);
        });

        it('should convert 8:30 to 8.5', () => {
            // Arrange
            const ownTime = new OwnTime('8', '30', true);

            // Act
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBe(8.5);
        });

        it('should convert 00:00 to 0', () => {
            // Arrange
            const ownTime = new OwnTime('00', '00', true);

            // Act
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBe(0);
        });

        it('should convert 1:20 to 1.333...', () => {
            // Arrange
            const ownTime = new OwnTime('1', '20', true);

            // Act
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBeCloseTo(1.3333, 3);
        });

        it('should return 0 for undefined input', () => {
            // Arrange
            const ownTime = undefined as unknown as OwnTime;

            // Act
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBe(0);
        });
    });

    describe('Round-trip conversion (Dezimal → OwnTime → Dezimal)', () => {
        it('should preserve 160.5 after round-trip', () => {
            // Arrange
            const original = 160.5;

            // Act
            const ownTime = transformNumberToOwnTime(original, true);
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBe(original);
        });

        it('should preserve 80.25 after round-trip', () => {
            // Arrange
            const original = 80.25;

            // Act
            const ownTime = transformNumberToOwnTime(original, true);
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBe(original);
        });

        it('should preserve 40.75 after round-trip', () => {
            // Arrange
            const original = 40.75;

            // Act
            const ownTime = transformNumberToOwnTime(original, true);
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBe(original);
        });

        it('should preserve whole numbers after round-trip', () => {
            // Arrange
            const original = 160;

            // Act
            const ownTime = transformNumberToOwnTime(original, true);
            const result = transformOwnTimeToNumber(ownTime);

            // Assert
            expect(result).toBe(original);
        });
    });

    describe('isOwnTimeStructOk', () => {
        it('should return true for valid OwnTime', () => {
            // Arrange
            const ownTime = new OwnTime('10', '30', false);

            // Act
            const result = isOwnTimeStructOk(ownTime);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for undefined', () => {
            // Arrange
            const ownTime = undefined;

            // Act
            const result = isOwnTimeStructOk(ownTime);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for object without hours', () => {
            // Arrange
            const ownTime = { minutes: '30' } as unknown as OwnTime;

            // Act
            const result = isOwnTimeStructOk(ownTime);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for object without minutes', () => {
            // Arrange
            const ownTime = { hours: '10' } as unknown as OwnTime;

            // Act
            const result = isOwnTimeStructOk(ownTime);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('transformStringToOwnTimeStruct', () => {
        it('should parse "14:30:00" correctly', () => {
            // Arrange
            const timeString = '14:30:00';

            // Act
            const result = transformStringToOwnTimeStruct(timeString);

            // Assert
            expect(result.hours).toBe('14');
            expect(result.minutes).toBe('30');
        });

        it('should parse "08:05" correctly', () => {
            // Arrange
            const timeString = '08:05';

            // Act
            const result = transformStringToOwnTimeStruct(timeString);

            // Assert
            expect(result.hours).toBe('08');
            expect(result.minutes).toBe('05');
        });

        it('should cap hours at 23 when isDuration is false', () => {
            // Arrange
            const timeString = '25:30';

            // Act
            const result = transformStringToOwnTimeStruct(timeString, false);

            // Assert
            expect(result.hours).toBe('00');
            expect(result.minutes).toBe('30');
        });

        it('should allow hours > 23 when isDuration is true', () => {
            // Arrange
            const timeString = '160:30';

            // Act
            const result = transformStringToOwnTimeStruct(timeString, true);

            // Assert
            expect(result.hours).toBe('160');
            expect(result.minutes).toBe('30');
        });

        it('should return 00:00 for empty string', () => {
            // Arrange
            const timeString = '';

            // Act
            const result = transformStringToOwnTimeStruct(timeString);

            // Assert
            expect(result.hours).toBe('00');
            expect(result.minutes).toBe('00');
        });

        it('should return 00:00 for invalid format', () => {
            // Arrange
            const timeString = 'invalid';

            // Act
            const result = transformStringToOwnTimeStruct(timeString);

            // Assert
            expect(result.hours).toBe('00');
            expect(result.minutes).toBe('00');
        });
    });

    describe('transformOwnTimeToString', () => {
        it('should convert OwnTime to string format', () => {
            // Arrange
            const ownTime = new OwnTime('14', '30', false);

            // Act
            const result = transformOwnTimeToString(ownTime);

            // Assert
            expect(result).toBe('14:30:00');
        });

        it('should handle single digit hours', () => {
            // Arrange
            const ownTime = new OwnTime('8', '5', false);

            // Act
            const result = transformOwnTimeToString(ownTime);

            // Assert
            expect(result).toBe('8:05:00');
        });

        it('should handle duration with hours > 23', () => {
            // Arrange
            const ownTime = new OwnTime('160', '30', true);

            // Act
            const result = transformOwnTimeToString(ownTime);

            // Assert
            expect(result).toBe('160:30:00');
        });
    });
});
