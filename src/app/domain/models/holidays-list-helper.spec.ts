import { TestBed } from '@angular/core/testing';
import { HolidayStatus, HolidaysListHelper, ICalendarRule, } from './calendar-rule-class';

describe('HolidaysListHelper', () => {
    let holidaysHelper: HolidaysListHelper;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [HolidaysListHelper],
        });

        holidaysHelper = TestBed.inject(HolidaysListHelper);
    });

    it('should initialize with the current year', () => {
        const currentYear = new Date().getFullYear();
        holidaysHelper.currentYear = currentYear;
        expect(holidaysHelper.currentYear).toBe(currentYear);
    });

    it('should add a calendar rule', () => {
        const rule: ICalendarRule = {
            id: 'test-id',
            rule: 'some-rule',
            state: 'test-state',
            country: 'test-country',
            isMandatory: true,
            isPaid: true,
            subRule: undefined,
        };

        holidaysHelper.add(rule);
        expect(holidaysHelper.count()).toBe(1);
    });

    it('should compute eastern', () => {
        // Arrange
        const rule: ICalendarRule = {
            id: 'test-id',
            rule: 'EASTER',
            name: { en: 'Test Holiday' },
            state: 'test-state',
            country: 'test-country',
            isMandatory: true,
            isPaid: true,
            subRule: undefined,
        };
        holidaysHelper.add(rule);

        // Act & Assert
        holidaysHelper.currentYear = 2023;
        holidaysHelper.computeHolidays();
        const easter2023 = holidaysHelper.holidayList[0]?.currentDate;
        console.log(`[TEST-DATA] Rule: EASTER | Year: 2023 | Result: ${easter2023?.toLocaleDateString('de-DE')} (expected: 09.04.2023)`);
        expect(holidaysHelper.holidayList.length).toBe(1);
        expect(holidaysHelper.isHoliday(new Date('4/9/2023'))).toBe(HolidayStatus.OfficialHoliday);

        holidaysHelper.currentYear = 2022;
        holidaysHelper.computeHolidays();
        const easter2022 = holidaysHelper.holidayList[0]?.currentDate;
        console.log(`[TEST-DATA] Rule: EASTER | Year: 2022 | Result: ${easter2022?.toLocaleDateString('de-DE')} (expected: 17.04.2022)`);
        expect(holidaysHelper.holidayList.length).toBe(1);
        expect(holidaysHelper.isHoliday(new Date('4/17/2022'))).toBe(HolidayStatus.OfficialHoliday);

        holidaysHelper.currentYear = 1959;
        holidaysHelper.computeHolidays();
        const easter1959 = holidaysHelper.holidayList[0]?.currentDate;
        console.log(`[TEST-DATA] Rule: EASTER | Year: 1959 | Result: ${easter1959?.toLocaleDateString('de-DE')} (expected: 30.03.1959)`);
        expect(holidaysHelper.holidayList.length).toBe(1);
        expect(holidaysHelper.isHoliday(new Date('3/30/1959'))).toBe(HolidayStatus.OfficialHoliday);
    });

    it('should compute pentecost', () => {
        // Arrange
        const rule: ICalendarRule = {
            id: 'test-id',
            rule: 'EASTER+49',
            name: { en: 'Test Holiday' },
            state: 'test-state',
            country: 'test-country',
            isMandatory: true,
            isPaid: true,
            subRule: undefined,
        };
        holidaysHelper.add(rule);

        // Act & Assert
        holidaysHelper.currentYear = 2023;
        holidaysHelper.computeHolidays();
        const pentecost2023 = holidaysHelper.holidayList[0]?.currentDate;
        console.log(`[TEST-DATA] Rule: EASTER+49 (Pfingsten) | Year: 2023 | Result: ${pentecost2023?.toLocaleDateString('de-DE')} (expected: 28.05.2023)`);
        expect(holidaysHelper.holidayList.length).toBe(1);
        expect(holidaysHelper.isHoliday(new Date('5/28/2023'))).toBe(HolidayStatus.OfficialHoliday);

        holidaysHelper.currentYear = 2022;
        holidaysHelper.computeHolidays();
        const pentecost2022 = holidaysHelper.holidayList[0]?.currentDate;
        console.log(`[TEST-DATA] Rule: EASTER+49 (Pfingsten) | Year: 2022 | Result: ${pentecost2022?.toLocaleDateString('de-DE')} (expected: 05.06.2022)`);
        expect(holidaysHelper.holidayList.length).toBe(1);
        expect(holidaysHelper.isHoliday(new Date('6/05/2022'))).toBe(HolidayStatus.OfficialHoliday);
    });

    it('should compute corpus christi', () => {
        // Arrange
        const rule: ICalendarRule = {
            id: 'test-id',
            rule: 'EASTER+60',
            name: { en: 'Test Holiday' },
            state: 'test-state',
            country: 'test-country',
            isMandatory: true,
            isPaid: true,
            subRule: undefined,
        };
        holidaysHelper.add(rule);

        // Act & Assert
        holidaysHelper.currentYear = 2023;
        holidaysHelper.computeHolidays();
        const corpus2023 = holidaysHelper.holidayList[0]?.currentDate;
        console.log(`[TEST-DATA] Rule: EASTER+60 (Fronleichnam) | Year: 2023 | Result: ${corpus2023?.toLocaleDateString('de-DE')} (expected: 08.06.2023)`);
        expect(holidaysHelper.holidayList.length).toBe(1);
        expect(holidaysHelper.isHoliday(new Date('6/08/2023'))).toBe(HolidayStatus.OfficialHoliday);

        holidaysHelper.currentYear = 2022;
        holidaysHelper.computeHolidays();
        const corpus2022 = holidaysHelper.holidayList[0]?.currentDate;
        console.log(`[TEST-DATA] Rule: EASTER+60 (Fronleichnam) | Year: 2022 | Result: ${corpus2022?.toLocaleDateString('de-DE')} (expected: 16.06.2022)`);
        expect(holidaysHelper.holidayList.length).toBe(1);
        expect(holidaysHelper.isHoliday(new Date('6/16/2022'))).toBe(HolidayStatus.OfficialHoliday);

        holidaysHelper.currentYear = 2018;
        holidaysHelper.computeHolidays();
        const corpus2018 = holidaysHelper.holidayList[0]?.currentDate;
        console.log(`[TEST-DATA] Rule: EASTER+60 (Fronleichnam) | Year: 2018 | Result: ${corpus2018?.toLocaleDateString('de-DE')} (expected: 31.05.2018)`);
        expect(holidaysHelper.holidayList.length).toBe(1);
        expect(holidaysHelper.isHoliday(new Date('5/31/2018'))).toBe(HolidayStatus.OfficialHoliday);
    });

    it('should compute silvester', () => {
        // Arrange
        const rule: ICalendarRule = {
            id: 'test-id',
            rule: '12/31',
            name: { en: 'Test Holiday' },
            state: 'test-state',
            country: 'test-country',
            isMandatory: true,
            isPaid: true,
            subRule: undefined,
        };
        holidaysHelper.add(rule);

        // Act & Assert
        holidaysHelper.currentYear = 2023;
        holidaysHelper.computeHolidays();
        const silvester = holidaysHelper.holidayList[0]?.currentDate;
        console.log(`[TEST-DATA] Rule: 12/31 (Silvester) | Year: 2023 | Result: ${silvester?.toLocaleDateString('de-DE')} (expected: 31.12.2023)`);
        expect(holidaysHelper.holidayList.length).toBe(1);
        expect(holidaysHelper.isHoliday(new Date('12/31/2023'))).toBe(HolidayStatus.OfficialHoliday);
    });

    it('should compute labor day', () => {
        // Arrange
        const rule: ICalendarRule = {
            id: 'test-id',
            rule: '05/01',
            name: { en: 'Test Holiday' },
            state: 'test-state',
            country: 'test-country',
            isMandatory: true,
            isPaid: true,
            subRule: undefined,
        };
        holidaysHelper.add(rule);

        // Act & Assert
        holidaysHelper.currentYear = 2023;
        holidaysHelper.computeHolidays();
        const laborDay = holidaysHelper.holidayList[0]?.currentDate;
        console.log(`[TEST-DATA] Rule: 05/01 (Tag der Arbeit) | Year: 2023 | Result: ${laborDay?.toLocaleDateString('de-DE')} (expected: 01.05.2023)`);
        expect(holidaysHelper.holidayList.length).toBe(1);
        expect(holidaysHelper.isHoliday(new Date('5/01/2023'))).toBe(HolidayStatus.OfficialHoliday);
    });

    it('is leap year', () => {
        // Arrange
        const leapYears = [1852, 1892, 1912, 1936, 1968, 1988, 2020, 2032, 2048];

        // Act & Assert
        leapYears.forEach(year => {
            const result = holidaysHelper.isLeapYear(year);
            console.log(`[TEST-DATA] Year: ${year} | isLeapYear: ${result} (expected: true)`);
            expect(result).toBe(true);
        });
    });

    it('is not leap year', () => {
        // Arrange
        const nonLeapYears = [1851, 1853, 1855, 1857, 1859, 1861, 1865, 1866, 1867];

        // Act & Assert
        nonLeapYears.forEach(year => {
            const result = holidaysHelper.isLeapYear(year);
            console.log(`[TEST-DATA] Year: ${year} | isLeapYear: ${result} (expected: false)`);
            expect(result).toBe(false);
        });
    });

    it('should return 1 for 1 January', () => {
        // Arrange
        const date = new Date(2023, 0, 1);

        // Act
        const result = holidaysHelper.daysIntoYear(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | daysIntoYear: ${result} (expected: 1)`);
        expect(result).toEqual(1);
    });

    it('should return 31 for 31 January', () => {
        // Arrange
        const date = new Date(2023, 0, 31);

        // Act
        const result = holidaysHelper.daysIntoYear(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | daysIntoYear: ${result} (expected: 31)`);
        expect(result).toEqual(31);
    });

    it('Should return 59 for 28 February in a non-leap year', () => {
        // Arrange
        const date = new Date(2023, 1, 28);

        // Act
        const result = holidaysHelper.daysIntoYear(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} (non-leap) | daysIntoYear: ${result} (expected: 59)`);
        expect(result).toEqual(59);
    });

    it('Should return 60 for 29 February in a leap year', () => {
        // Arrange
        const date = new Date(2024, 1, 29);

        // Act
        const result = holidaysHelper.daysIntoYear(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} (leap year) | daysIntoYear: ${result} (expected: 60)`);
        expect(result).toEqual(60);
    });

    it('should return week 52 for 1st January 2022', () => {
        // Arrange
        const date = new Date(2022, 0, 1);

        // Act
        const result = holidaysHelper.getISO8601WeekNumber(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | ISO Week: ${result} (expected: 52)`);
        expect(result).toEqual(52);
    });

    it('should return week 52 for 31st December 2021', () => {
        // Arrange
        const date = new Date(2021, 11, 31);

        // Act
        const result = holidaysHelper.getISO8601WeekNumber(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | ISO Week: ${result} (expected: 52)`);
        expect(result).toEqual(52);
    });

    it('should return week 1 for 4th January 2021', () => {
        // Arrange
        const date = new Date(2021, 0, 4);

        // Act
        const result = holidaysHelper.getISO8601WeekNumber(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | ISO Week: ${result} (expected: 1)`);
        expect(result).toEqual(1);
    });

    it('should return week 53 for 31st December 2020', () => {
        // Arrange
        const date = new Date(2020, 11, 31);

        // Act
        const result = holidaysHelper.getISO8601WeekNumber(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | ISO Week: ${result} (expected: 53)`);
        expect(result).toEqual(53);
    });

    it('should return week 2 for 6th January 2020', () => {
        // Arrange
        const date = new Date(2020, 0, 6);

        // Act
        const result = holidaysHelper.getISO8601WeekNumber(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | ISO Week: ${result} (expected: 2)`);
        expect(result).toEqual(2);
    });

    it('should return week 1 for 30th December 2019', () => {
        // Arrange
        const date = new Date(2019, 11, 30);

        // Act
        const result = holidaysHelper.getISO8601WeekNumber(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | ISO Week: ${result} (expected: 1)`);
        expect(result).toEqual(1);
    });

    it('should return week 2 for 7th January 2019', () => {
        // Arrange
        const date = new Date(2019, 0, 7);

        // Act
        const result = holidaysHelper.getISO8601WeekNumber(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | ISO Week: ${result} (expected: 2)`);
        expect(result).toEqual(2);
    });

    it('should return week 1 for 1st January 2018', () => {
        // Arrange
        const date = new Date(2018, 0, 1);

        // Act
        const result = holidaysHelper.getISO8601WeekNumber(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | ISO Week: ${result} (expected: 1)`);
        expect(result).toEqual(1);
    });

    it('should return week 1 for 31st December 2018', () => {
        // Arrange
        const date = new Date(2018, 11, 31);

        // Act
        const result = holidaysHelper.getISO8601WeekNumber(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | ISO Week: ${result} (expected: 1)`);
        expect(result).toEqual(1);
    });

    it('should return week 52 for 25th December 2017', () => {
        // Arrange
        const date = new Date(2017, 11, 25);

        // Act
        const result = holidaysHelper.getISO8601WeekNumber(date);

        // Assert
        console.log(`[TEST-DATA] Date: ${date.toLocaleDateString('de-DE')} | ISO Week: ${result} (expected: 52)`);
        expect(result).toEqual(52);
    });
});
