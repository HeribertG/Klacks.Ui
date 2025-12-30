import {
    formatTime,
    timeToString,
    parseTime,
    isValidTimeString,
    timeToMinutes,
    calculateDurationInMinutes,
    formatTimeFromMinutes,
} from './time-format.helper';

describe('Time Format Helper', () => {
    describe('formatTime', () => {
        it('should format "14:30:00" to "14:30"', () => {
            expect(formatTime('14:30:00')).toBe('14:30');
        });

        it('should format "09:05:15" to "09:05"', () => {
            expect(formatTime('09:05:15')).toBe('09:05');
        });

        it('should return empty string for undefined', () => {
            expect(formatTime(undefined)).toBe('');
        });
    });

    describe('timeToString', () => {
        it('should convert 14, 30 to "14:30:00"', () => {
            expect(timeToString(14, 30)).toBe('14:30:00');
        });

        it('should pad single digits with leading zeros', () => {
            expect(timeToString(9, 5)).toBe('09:05:00');
        });

        it('should handle midnight', () => {
            expect(timeToString(0, 0)).toBe('00:00:00');
        });
    });

    describe('parseTime', () => {
        it('should parse "14:30:00" correctly', () => {
            const result = parseTime('14:30:00');
            expect(result).toEqual({ hours: 14, minutes: 30 });
        });

        it('should parse "09:05" correctly', () => {
            const result = parseTime('09:05');
            expect(result).toEqual({ hours: 9, minutes: 5 });
        });

        it('should return null for undefined', () => {
            expect(parseTime(undefined)).toBeNull();
        });

        it('should return null for invalid format', () => {
            expect(parseTime('invalid')).toBeNull();
        });

        it('should return null for invalid hour (25)', () => {
            expect(parseTime('25:00:00')).toBeNull();
        });

        it('should return null for invalid minute (60)', () => {
            expect(parseTime('14:60:00')).toBeNull();
        });
    });

    describe('isValidTimeString', () => {
        it('should return true for valid time', () => {
            expect(isValidTimeString('14:30:00')).toBe(true);
        });

        it('should return false for invalid time', () => {
            expect(isValidTimeString('25:00:00')).toBe(false);
        });
    });

    describe('timeToMinutes', () => {
        it('should convert "14:30:00" to 870 minutes', () => {
            expect(timeToMinutes('14:30:00')).toBe(870);
        });

        it('should convert "09:05" to 545 minutes', () => {
            expect(timeToMinutes('09:05')).toBe(545);
        });

        it('should convert "00:00" to 0 minutes', () => {
            expect(timeToMinutes('00:00')).toBe(0);
        });

        it('should convert "23:59" to 1439 minutes', () => {
            expect(timeToMinutes('23:59')).toBe(1439);
        });
    });

    describe('calculateDurationInMinutes', () => {
        it('should calculate 90 minutes for 09:00 to 10:30', () => {
            // Arrange
            const start = '09:00:00';
            const end = '10:30:00';

            // Act
            const result = calculateDurationInMinutes(start, end);

            // Assert
            expect(result).toBe(90);
        });

        it('should calculate 75 minutes for 14:00 to 15:15', () => {
            // Arrange
            const start = '14:00';
            const end = '15:15';

            // Act
            const result = calculateDurationInMinutes(start, end);

            // Assert
            expect(result).toBe(75);
        });

        it('should handle overnight shifts (22:00 to 06:00)', () => {
            // Arrange
            const start = '22:00:00';
            const end = '06:00:00';

            // Act
            const result = calculateDurationInMinutes(start, end);

            // Assert
            expect(result).toBe(480); // 8 hours
        });

        it('should return 0 for undefined start', () => {
            expect(calculateDurationInMinutes(undefined, '10:00')).toBe(0);
        });

        it('should return 0 for undefined end', () => {
            expect(calculateDurationInMinutes('09:00', undefined)).toBe(0);
        });

        it('should calculate 1 minute duration', () => {
            // Arrange
            const start = '09:00:00';
            const end = '09:01:00';

            // Act
            const result = calculateDurationInMinutes(start, end);

            // Assert
            expect(result).toBe(1);
        });

        it('should return 0 for same start and end time', () => {
            // Arrange - same time means 0 duration
            const start = '00:00:00';
            const end = '00:00:00';

            // Act
            const result = calculateDurationInMinutes(start, end);

            // Assert
            expect(result).toBe(0);
        });

        it('should calculate 2 minutes duration', () => {
            // Arrange
            const start = '09:00:00';
            const end = '09:02:00';

            // Act
            const result = calculateDurationInMinutes(start, end);

            // Assert
            expect(result).toBe(2);
        });

        it('should calculate 4 minutes duration', () => {
            // Arrange
            const start = '09:00:00';
            const end = '09:04:00';

            // Act
            const result = calculateDurationInMinutes(start, end);

            // Assert
            expect(result).toBe(4);
        });
    });

    describe('formatTimeFromMinutes', () => {
        it('should format 870 minutes to "14:30:00"', () => {
            expect(formatTimeFromMinutes(870)).toBe('14:30:00');
        });

        it('should format 545 minutes to "09:05:00"', () => {
            expect(formatTimeFromMinutes(545)).toBe('09:05:00');
        });

        it('should handle overflow (1500 minutes = 01:00:00 next day)', () => {
            expect(formatTimeFromMinutes(1500)).toBe('01:00:00');
        });

        it('should format 0 minutes to "00:00:00"', () => {
            expect(formatTimeFromMinutes(0)).toBe('00:00:00');
        });
    });

    describe('Round-trip: timeToMinutes ↔ formatTimeFromMinutes', () => {
        const testCases = [
            '00:00:00',
            '00:01:00',
            '00:07:00',
            '00:11:00',
            '00:13:00',
            '00:17:00',
            '00:19:00',
            '00:23:00',
            '00:29:00',
            '00:31:00',
            '00:37:00',
            '00:41:00',
            '00:43:00',
            '00:47:00',
            '00:53:00',
            '00:59:00',
            '08:30:00',
            '12:45:00',
            '17:15:00',
            '23:59:00',
        ];

        testCases.forEach((time) => {
            it(`should preserve "${time}" after round-trip`, () => {
                // Arrange
                const originalTime = time;

                // Act
                const minutes = timeToMinutes(originalTime);
                const result = formatTimeFromMinutes(minutes);

                // Assert
                expect(result).toBe(originalTime);
            });
        });
    });

    describe('Minuten → Dezimal-Stunden → Minuten (Rundungsfehler-Tests)', () => {
        function minutesToDecimalHours(minutes: number): number {
            return minutes / 60;
        }

        function decimalHoursToMinutes(decimalHours: number): number {
            return Math.round(decimalHours * 60);
        }

        it('should preserve 1 minute after round-trip', () => {
            // Arrange
            const originalMinutes = 1;

            // Act
            const decimal = minutesToDecimalHours(originalMinutes); // 0.01666...
            const result = decimalHoursToMinutes(decimal);

            // Assert
            expect(result).toBe(originalMinutes);
        });

        it('should preserve 2 minutes after round-trip', () => {
            // Arrange
            const originalMinutes = 2;

            // Act
            const decimal = minutesToDecimalHours(originalMinutes); // 0.03333...
            const result = decimalHoursToMinutes(decimal);

            // Assert
            expect(result).toBe(originalMinutes);
        });

        it('should preserve 4 minutes after round-trip', () => {
            // Arrange
            const originalMinutes = 4;

            // Act
            const decimal = minutesToDecimalHours(originalMinutes); // 0.06666...
            const result = decimalHoursToMinutes(decimal);

            // Assert
            expect(result).toBe(originalMinutes);
        });

        it('should preserve 7 minutes after round-trip', () => {
            // Arrange
            const originalMinutes = 7;

            // Act
            const decimal = minutesToDecimalHours(originalMinutes); // 0.11666...
            const result = decimalHoursToMinutes(decimal);

            // Assert
            expect(result).toBe(originalMinutes);
        });

        it('should preserve 11 minutes after round-trip', () => {
            // Arrange
            const originalMinutes = 11;

            // Act
            const decimal = minutesToDecimalHours(originalMinutes); // 0.18333...
            const result = decimalHoursToMinutes(decimal);

            // Assert
            expect(result).toBe(originalMinutes);
        });

        it('should preserve 13 minutes after round-trip', () => {
            // Arrange
            const originalMinutes = 13;

            // Act
            const decimal = minutesToDecimalHours(originalMinutes);
            const result = decimalHoursToMinutes(decimal);

            // Assert
            expect(result).toBe(originalMinutes);
        });

        it('should preserve 17 minutes after round-trip', () => {
            // Arrange
            const originalMinutes = 17;

            // Act
            const decimal = minutesToDecimalHours(originalMinutes);
            const result = decimalHoursToMinutes(decimal);

            // Assert
            expect(result).toBe(originalMinutes);
        });

        it('should preserve 19 minutes after round-trip', () => {
            // Arrange
            const originalMinutes = 19;

            // Act
            const decimal = minutesToDecimalHours(originalMinutes);
            const result = decimalHoursToMinutes(decimal);

            // Assert
            expect(result).toBe(originalMinutes);
        });

        it('should preserve 23 minutes after round-trip', () => {
            // Arrange
            const originalMinutes = 23;

            // Act
            const decimal = minutesToDecimalHours(originalMinutes);
            const result = decimalHoursToMinutes(decimal);

            // Assert
            expect(result).toBe(originalMinutes);
        });

        it('should preserve 29 minutes after round-trip', () => {
            // Arrange
            const originalMinutes = 29;

            // Act
            const decimal = minutesToDecimalHours(originalMinutes);
            const result = decimalHoursToMinutes(decimal);

            // Assert
            expect(result).toBe(originalMinutes);
        });

        it('should preserve all minutes 0-59 after round-trip', () => {
            for (let minutes = 0; minutes <= 59; minutes++) {
                // Arrange
                const originalMinutes = minutes;

                // Act
                const decimal = minutesToDecimalHours(originalMinutes);
                const result = decimalHoursToMinutes(decimal);

                // Assert
                expect(result).toBe(originalMinutes);
            }
        });

        describe('Akkumulierte Rundungsfehler bei Summierung', () => {
            it('should handle sum of 60 × 1 minute correctly', () => {
                // Arrange - 60 einzelne Minuten summieren
                const oneMinuteDecimal = 1 / 60; // 0.01666...
                let sum = 0;

                // Act
                for (let i = 0; i < 60; i++) {
                    sum += oneMinuteDecimal;
                }
                const resultMinutes = Math.round(sum * 60);

                // Assert - sollte 60 Minuten = 1 Stunde sein
                expect(resultMinutes).toBe(60);
            });

            it('should handle sum of 7 × 7 minutes correctly', () => {
                // Arrange - 7 × 7 Minuten = 49 Minuten
                const sevenMinutesDecimal = 7 / 60; // 0.11666...
                let sum = 0;

                // Act
                for (let i = 0; i < 7; i++) {
                    sum += sevenMinutesDecimal;
                }
                const resultMinutes = Math.round(sum * 60);

                // Assert
                expect(resultMinutes).toBe(49);
            });

            it('should handle sum of 3 × 1 minute correctly', () => {
                // Arrange
                const oneMinuteDecimal = 1 / 60;
                const sum = oneMinuteDecimal + oneMinuteDecimal + oneMinuteDecimal;

                // Act
                const resultMinutes = Math.round(sum * 60);

                // Assert
                expect(resultMinutes).toBe(3);
            });

            it('should handle sum of 100 × 1 minute correctly', () => {
                // Arrange - 100 Minuten = 1h 40min
                const oneMinuteDecimal = 1 / 60;
                let sum = 0;

                // Act
                for (let i = 0; i < 100; i++) {
                    sum += oneMinuteDecimal;
                }
                const resultHours = Math.floor(sum);
                const resultMinutes = Math.round((sum - resultHours) * 60);

                // Assert
                expect(resultHours).toBe(1);
                expect(resultMinutes).toBe(40);
            });

            it('should handle sum of many small durations (worst case)', () => {
                // Arrange - viele 1-Minuten Einträge
                const entries = 1000; // 1000 × 1 Minute = 16h 40min
                const oneMinuteDecimal = 1 / 60;
                let sum = 0;

                // Act
                for (let i = 0; i < entries; i++) {
                    sum += oneMinuteDecimal;
                }
                const totalMinutes = Math.round(sum * 60);

                // Assert
                expect(totalMinutes).toBe(1000);
            });

            it('should handle mixed durations sum correctly', () => {
                // Arrange - verschiedene Dauern summieren
                const durations = [1, 2, 4, 7, 11, 13, 17, 19, 23, 29]; // Primzahlen
                const expectedTotal = durations.reduce((a, b) => a + b, 0); // 126 Minuten
                let sum = 0;

                // Act
                for (const minutes of durations) {
                    sum += minutes / 60;
                }
                const resultMinutes = Math.round(sum * 60);

                // Assert
                expect(resultMinutes).toBe(expectedTotal);
            });
        });

        describe('Datenbank-Präzision Simulation', () => {
            function simulateDbPrecision(value: number, decimalPlaces: number): number {
                const factor = Math.pow(10, decimalPlaces);
                return Math.round(value * factor) / factor;
            }

            it('should handle 1 minute with 4 decimal places (PostgreSQL decimal(10,4))', () => {
                // Arrange
                const minutes = 1;
                const decimalHours = minutes / 60; // 0.01666666...

                // Act - Datenbank rundet auf 4 Nachkommastellen
                const dbValue = simulateDbPrecision(decimalHours, 4); // 0.0167
                const recoveredMinutes = Math.round(dbValue * 60);

                // Assert
                expect(dbValue).toBe(0.0167);
                expect(recoveredMinutes).toBe(1); // 0.0167 * 60 = 1.002 → 1
            });

            it('should handle 2 minutes with 4 decimal places', () => {
                // Arrange
                const minutes = 2;
                const decimalHours = minutes / 60; // 0.03333...

                // Act
                const dbValue = simulateDbPrecision(decimalHours, 4); // 0.0333
                const recoveredMinutes = Math.round(dbValue * 60);

                // Assert
                expect(dbValue).toBe(0.0333);
                expect(recoveredMinutes).toBe(2); // 0.0333 * 60 = 1.998 → 2
            });

            it('should handle 4 minutes with 4 decimal places', () => {
                // Arrange
                const minutes = 4;
                const decimalHours = minutes / 60; // 0.06666...

                // Act
                const dbValue = simulateDbPrecision(decimalHours, 4); // 0.0667
                const recoveredMinutes = Math.round(dbValue * 60);

                // Assert
                expect(dbValue).toBe(0.0667);
                expect(recoveredMinutes).toBe(4); // 0.0667 * 60 = 4.002 → 4
            });

            it('should handle 7 minutes with 4 decimal places', () => {
                // Arrange
                const minutes = 7;
                const decimalHours = minutes / 60; // 0.11666...

                // Act
                const dbValue = simulateDbPrecision(decimalHours, 4); // 0.1167
                const recoveredMinutes = Math.round(dbValue * 60);

                // Assert
                expect(dbValue).toBe(0.1167);
                expect(recoveredMinutes).toBe(7); // 0.1167 * 60 = 7.002 → 7
            });

            it('should handle all minutes 0-59 with 4 decimal places', () => {
                for (let minutes = 0; minutes <= 59; minutes++) {
                    // Arrange
                    const decimalHours = minutes / 60;

                    // Act
                    const dbValue = simulateDbPrecision(decimalHours, 4);
                    const recoveredMinutes = Math.round(dbValue * 60);

                    // Assert
                    expect(recoveredMinutes).toBe(minutes);
                }
            });

            it('should handle all minutes 0-59 with 2 decimal places (worst case)', () => {
                const failures: { minutes: number; recovered: number }[] = [];

                for (let minutes = 0; minutes <= 59; minutes++) {
                    // Arrange
                    const decimalHours = minutes / 60;

                    // Act - nur 2 Nachkommastellen (sehr grob)
                    const dbValue = simulateDbPrecision(decimalHours, 2);
                    const recoveredMinutes = Math.round(dbValue * 60);

                    // Collect failures
                    if (recoveredMinutes !== minutes) {
                        failures.push({ minutes, recovered: recoveredMinutes });
                    }
                }

                // Assert - dokumentiere welche Minuten bei 2 Dezimalstellen fehlschlagen
                // Bei 2 Dezimalstellen gibt es Rundungsfehler!
                // z.B. 7 min = 0.1166... → 0.12 → 7.2 → 7 (OK)
                // z.B. 8 min = 0.1333... → 0.13 → 7.8 → 8 (OK)
                // Aber einige Grenzfälle können fehlschlagen
                if (failures.length > 0) {
                    console.log('Failures with 2 decimal places:', failures);
                }
                // Mit 2 Dezimalstellen erwarten wir einige Fehler
                expect(failures.length).toBeLessThanOrEqual(10);
            });

            it('should handle sum of durations with DB precision', () => {
                // Arrange - simuliere mehrere Einträge die einzeln in DB gespeichert werden
                const durations = [1, 2, 4, 7, 11]; // 25 Minuten gesamt
                let dbSum = 0;

                // Act - jeder Wert wird einzeln in DB gerundet und dann summiert
                for (const minutes of durations) {
                    const decimalHours = minutes / 60;
                    const dbValue = simulateDbPrecision(decimalHours, 4);
                    dbSum += dbValue;
                }
                const recoveredMinutes = Math.round(dbSum * 60);

                // Assert
                expect(recoveredMinutes).toBe(25);
            });

            it('should handle 160h 30min contract hours with DB precision', () => {
                // Arrange - Vertragsstunden
                const hours = 160;
                const minutes = 30;
                const decimalHours = hours + minutes / 60; // 160.5

                // Act
                const dbValue = simulateDbPrecision(decimalHours, 4); // 160.5000
                const recoveredHours = Math.floor(dbValue);
                const recoveredMinutes = Math.round((dbValue - recoveredHours) * 60);

                // Assert
                expect(recoveredHours).toBe(160);
                expect(recoveredMinutes).toBe(30);
            });

            it('should handle 80h 7min contract hours with DB precision', () => {
                // Arrange - Vertragsstunden mit "schwieriger" Minutenzahl
                const hours = 80;
                const minutes = 7;
                const decimalHours = hours + minutes / 60; // 80.11666...

                // Act
                const dbValue = simulateDbPrecision(decimalHours, 4); // 80.1167
                const recoveredHours = Math.floor(dbValue);
                const recoveredMinutes = Math.round((dbValue - recoveredHours) * 60);

                // Assert
                expect(recoveredHours).toBe(80);
                expect(recoveredMinutes).toBe(7); // 0.1167 * 60 = 7.002 → 7
            });
        });

        it('should preserve minutes with hours after round-trip', () => {
            const testCases = [
                { hours: 160, minutes: 1 },
                { hours: 160, minutes: 7 },
                { hours: 80, minutes: 11 },
                { hours: 40, minutes: 17 },
                { hours: 8, minutes: 23 },
            ];

            testCases.forEach(({ hours, minutes }) => {
                // Arrange
                const totalMinutes = hours * 60 + minutes;
                const decimalHours = totalMinutes / 60;

                // Act
                const resultHours = Math.floor(decimalHours);
                const resultMinutes = Math.round((decimalHours - resultHours) * 60);

                // Assert
                expect(resultHours).toBe(hours);
                expect(resultMinutes).toBe(minutes);
            });
        });
    });

    describe('workTime Berechnung (Schicht-Dauer als Dezimal-Stunden)', () => {
        it('should calculate 8.5 hours for 09:00-17:30 shift', () => {
            // Arrange
            const startShift = '09:00:00';
            const endShift = '17:30:00';

            // Act
            const durationMinutes = calculateDurationInMinutes(startShift, endShift);
            const workTime = durationMinutes / 60;

            // Assert
            expect(durationMinutes).toBe(510);
            expect(workTime).toBe(8.5);
        });

        it('should calculate correct workTime for 1 minute shift', () => {
            // Arrange
            const startShift = '09:00:00';
            const endShift = '09:01:00';

            // Act
            const durationMinutes = calculateDurationInMinutes(startShift, endShift);
            const workTime = durationMinutes / 60;

            // Assert
            expect(durationMinutes).toBe(1);
            expect(workTime).toBeCloseTo(0.01666666666666666, 10);
        });

        it('should round-trip workTime correctly for 1 minute shift', () => {
            // Arrange
            const startShift = '09:00:00';
            const endShift = '09:01:00';

            // Act - simulate what happens in the system
            const durationMinutes = calculateDurationInMinutes(startShift, endShift);
            const workTime = durationMinutes / 60; // Store as decimal
            const recoveredMinutes = Math.round(workTime * 60); // Recover minutes

            // Assert
            expect(recoveredMinutes).toBe(1);
        });

        it('should round-trip workTime correctly for 2 minute shift', () => {
            // Arrange
            const startShift = '09:00:00';
            const endShift = '09:02:00';

            // Act
            const durationMinutes = calculateDurationInMinutes(startShift, endShift);
            const workTime = durationMinutes / 60;
            const recoveredMinutes = Math.round(workTime * 60);

            // Assert
            expect(recoveredMinutes).toBe(2);
        });

        it('should round-trip workTime correctly for 4 minute shift', () => {
            // Arrange
            const startShift = '09:00:00';
            const endShift = '09:04:00';

            // Act
            const durationMinutes = calculateDurationInMinutes(startShift, endShift);
            const workTime = durationMinutes / 60;
            const recoveredMinutes = Math.round(workTime * 60);

            // Assert
            expect(recoveredMinutes).toBe(4);
        });

        it('should round-trip workTime correctly for 7 minute shift', () => {
            // Arrange
            const startShift = '09:00:00';
            const endShift = '09:07:00';

            // Act
            const durationMinutes = calculateDurationInMinutes(startShift, endShift);
            const workTime = durationMinutes / 60;
            const recoveredMinutes = Math.round(workTime * 60);

            // Assert
            expect(recoveredMinutes).toBe(7);
        });

        it('should handle overnight shift workTime correctly', () => {
            // Arrange
            const startShift = '22:00:00';
            const endShift = '06:30:00';

            // Act
            const durationMinutes = calculateDurationInMinutes(startShift, endShift);
            const workTime = durationMinutes / 60;

            // Assert
            expect(durationMinutes).toBe(510); // 8.5 hours
            expect(workTime).toBe(8.5);
        });
    });
});
