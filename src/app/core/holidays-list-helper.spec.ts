import { TestBed } from '@angular/core/testing';
import {
  HolidayStatus,
  HolidaysListHelper,
  ICalendarRule,
} from './calendar-rule-class';

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

    holidaysHelper.currentYear = 2023;
    holidaysHelper.computeHolidays();
    expect(holidaysHelper.holidayList.length).toBe(1);
    expect(holidaysHelper.isHoliday(new Date('4/9/2023'))).toBe(
      HolidayStatus.OfficialHoliday
    );

    holidaysHelper.currentYear = 2022;
    holidaysHelper.computeHolidays();
    expect(holidaysHelper.holidayList.length).toBe(1);
    expect(holidaysHelper.isHoliday(new Date('4/17/2022'))).toBe(
      HolidayStatus.OfficialHoliday
    );

    holidaysHelper.currentYear = 1959;
    holidaysHelper.computeHolidays();
    expect(holidaysHelper.holidayList.length).toBe(1);
    expect(holidaysHelper.isHoliday(new Date('3/30/1959'))).toBe(
      HolidayStatus.OfficialHoliday
    );
  });

  it('should compute pentecost', () => {
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

    holidaysHelper.currentYear = 2023;
    holidaysHelper.computeHolidays();
    expect(holidaysHelper.holidayList.length).toBe(1);
    expect(holidaysHelper.isHoliday(new Date('5/28/2023'))).toBe(
      HolidayStatus.OfficialHoliday
    );

    holidaysHelper.currentYear = 2022;
    holidaysHelper.computeHolidays();
    expect(holidaysHelper.holidayList.length).toBe(1);
    expect(holidaysHelper.isHoliday(new Date('6/05/2022'))).toBe(
      HolidayStatus.OfficialHoliday
    );
  });

  it('should compute corpus christi', () => {
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

    holidaysHelper.currentYear = 2023;
    holidaysHelper.computeHolidays();
    expect(holidaysHelper.holidayList.length).toBe(1);

    expect(holidaysHelper.isHoliday(new Date('6/08/2023'))).toBe(
      HolidayStatus.OfficialHoliday
    );

    holidaysHelper.currentYear = 2022;
    holidaysHelper.computeHolidays();
    expect(holidaysHelper.holidayList.length).toBe(1);
    expect(holidaysHelper.isHoliday(new Date('6/16/2022'))).toBe(
      HolidayStatus.OfficialHoliday
    );

    holidaysHelper.currentYear = 2018;
    holidaysHelper.computeHolidays();
    expect(holidaysHelper.holidayList.length).toBe(1);
    expect(holidaysHelper.isHoliday(new Date('5/31/2018'))).toBe(
      HolidayStatus.OfficialHoliday
    );
  });

  it('should compute silvester', () => {
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

    holidaysHelper.currentYear = 2023;
    holidaysHelper.computeHolidays();
    expect(holidaysHelper.holidayList.length).toBe(1);
    expect(holidaysHelper.isHoliday(new Date('12/31/2023'))).toBe(
      HolidayStatus.OfficialHoliday
    );
  });

  it('should compute labor day', () => {
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

    holidaysHelper.currentYear = 2023;
    holidaysHelper.computeHolidays();
    expect(holidaysHelper.holidayList.length).toBe(1);
    expect(holidaysHelper.isHoliday(new Date('5/01/2023'))).toBe(
      HolidayStatus.OfficialHoliday
    );
  });

  it('is leap year', () => {
    expect(holidaysHelper.isLeapYear(1852)).toBeTrue();
    expect(holidaysHelper.isLeapYear(1892)).toBeTrue();
    expect(holidaysHelper.isLeapYear(1912)).toBeTrue();
    expect(holidaysHelper.isLeapYear(1936)).toBeTrue();
    expect(holidaysHelper.isLeapYear(1968)).toBeTrue();
    expect(holidaysHelper.isLeapYear(1988)).toBeTrue();
    expect(holidaysHelper.isLeapYear(2020)).toBeTrue();
    expect(holidaysHelper.isLeapYear(2032)).toBeTrue();
    expect(holidaysHelper.isLeapYear(2048)).toBeTrue();
  });

  it('is not leap year', () => {
    expect(holidaysHelper.isLeapYear(1851)).toBeFalse();
    expect(holidaysHelper.isLeapYear(1853)).toBeFalse();
    expect(holidaysHelper.isLeapYear(1855)).toBeFalse();
    expect(holidaysHelper.isLeapYear(1857)).toBeFalse();
    expect(holidaysHelper.isLeapYear(1859)).toBeFalse();
    expect(holidaysHelper.isLeapYear(1861)).toBeFalse();
    expect(holidaysHelper.isLeapYear(1865)).toBeFalse();
    expect(holidaysHelper.isLeapYear(1866)).toBeFalse();
    expect(holidaysHelper.isLeapYear(1867)).toBeFalse();
  });

  it('should return 1 for 1 January', () => {
    const date = new Date(2023, 0, 1);
    expect(holidaysHelper.daysIntoYear(date)).toEqual(1);
  });

  it('should return 31 for 31 January', () => {
    const date = new Date(2023, 0, 31);
    expect(holidaysHelper.daysIntoYear(date)).toEqual(31);
  });

  it('Should return 59 for 28 February in a non-leap year', () => {
    const date = new Date(2023, 1, 28);
    expect(holidaysHelper.daysIntoYear(date)).toEqual(59);
  });

  it('Should return 60 for 29 February in a leap year', () => {
    const date = new Date(2024, 1, 29);
    expect(holidaysHelper.daysIntoYear(date)).toEqual(60);
  });

  it('should return week 52 for 1st January 2022', () => {
    expect(holidaysHelper.getISO8601WeekNumber(new Date(2022, 0, 1))).toEqual(
      52
    );
  });

  it('should return week 52 for 31st December 2021', () => {
    expect(holidaysHelper.getISO8601WeekNumber(new Date(2021, 11, 31))).toEqual(
      52
    );
  });

  it('should return week 1 for 4th January 2021', () => {
    expect(holidaysHelper.getISO8601WeekNumber(new Date(2021, 0, 4))).toEqual(
      1
    );
  });

  it('should return week 53 for 31st December 2020', () => {
    expect(holidaysHelper.getISO8601WeekNumber(new Date(2020, 11, 31))).toEqual(
      53
    );
  });

  it('should return week 2 for 6th January 2020', () => {
    expect(holidaysHelper.getISO8601WeekNumber(new Date(2020, 0, 6))).toEqual(
      2
    );
  });

  it('should return week 1 for 30th December 2019', () => {
    expect(holidaysHelper.getISO8601WeekNumber(new Date(2019, 11, 30))).toEqual(
      1
    );
  });

  it('should return week 2 for 7th January 2019', () => {
    expect(holidaysHelper.getISO8601WeekNumber(new Date(2019, 0, 7))).toEqual(
      2
    );
  });

  it('should return week 1 for 1st January 2018', () => {
    expect(holidaysHelper.getISO8601WeekNumber(new Date(2018, 0, 1))).toEqual(
      1
    );
  });

  it('should return week 1 for 31st December 2018', () => {
    expect(holidaysHelper.getISO8601WeekNumber(new Date(2018, 11, 31))).toEqual(
      1
    );
  });

  it('should return week 52 for 25th December 2017', () => {
    expect(holidaysHelper.getISO8601WeekNumber(new Date(2017, 11, 25))).toEqual(
      52
    );
  });
});
