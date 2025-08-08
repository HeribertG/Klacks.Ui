/* eslint-disable @typescript-eslint/prefer-for-of */
/* eslint-disable prefer-const */
import {
  BaseFilter,
  BaseTruncated,
  IBaseFilter,
  IBaseTruncated,
} from './general-class';
import moment from 'moment';
import { MultiLanguage } from './multi-language-class';

export interface ICalendarRulesFilter extends IBaseFilter {
  list: StateCountryToken[];
  language: string | undefined;
}

export enum HolidayStatus {
  NotAHoliday = 0,
  UnofficialHoliday = 1,
  OfficialHoliday = 2,
}

export class StateCountryToken {
  id = '';
  country = '';
  countryName: MultiLanguage = new MultiLanguage();
  state = '';
  stateName: MultiLanguage = new MultiLanguage();
  select = false;
}

export class CalendarRulesFilter
  extends BaseFilter
  implements ICalendarRulesFilter
{
  list: StateCountryToken[] = [];
  language = 'en';
  countries: string[] = [];
}

export interface ITruncatedCalendarRule extends IBaseTruncated {
  calendarRules: CalendarRule[];
}

export class TruncatedCalendarRule
  extends BaseTruncated
  implements ITruncatedCalendarRule
{
  calendarRules: CalendarRule[] = [];
}

export interface ICalendarRule {
  id: string | undefined;
  name?: MultiLanguage | undefined;
  description?: MultiLanguage | undefined;
  rule: string | undefined;
  subRule: string | undefined;
  isMandatory: boolean;
  isPaid: boolean;
  state: string;
  country: string;
}

export class CalendarRule implements ICalendarRule {
  id = '';
  name?: MultiLanguage | undefined = undefined;
  description?: MultiLanguage | undefined = undefined;
  rule = '';
  subRule = '';
  isMandatory = true;
  isPaid = true;
  state = '';
  country = '';
}

export class PossibleHolidayRule {
  country = '';
  state = '';
  selected = false;
  rule: ICalendarRule | undefined = undefined;
}

export class PossibleHolidayRuleWrapper {
  public possibleHolidayList: PossibleHolidayRule[] = [];

  public clear() {
    this.possibleHolidayList = [];
  }
  public exist(value: ICalendarRule): boolean {
    return (
      this.possibleHolidayList.findIndex(
        (x) => x.country === value.country && x.state === value.state
      ) > -1
    );
  }
  public add(value: PossibleHolidayRule) {
    this.possibleHolidayList.push(value);
  }

  public setFilter(tokens: StateCountryToken[]) {
    this.resetSelection();

    tokens.forEach((token) => {
      const filteredHolidays = this.possibleHolidayList.filter(
        (holiday) =>
          token.country === holiday.country && token.state === holiday.state
      );
      filteredHolidays.forEach((x) => {
        x.selected = true;
      });
    });
  }
  private resetSelection() {
    this.possibleHolidayList.forEach((x) => {
      x.selected = false;
    });
  }

  getFilterData(): PossibleHolidayRule[] {
    return this.possibleHolidayList.filter((x) => x.selected === true);
  }
}

export class HolidaysListHelper {
  private yearNumber: number = new Date(Date.now()).getFullYear();
  private readonly WEEKDAY_NAME: string = 'SUMOTUWETHFRSA'; //  Sunday (SU),Monday (MO),Tuesday (TU),Wednesday (WE),Thursday (TH),Friday (FR),Saturday (SA)
  private readonly EASTER_STRING: string = 'EASTER';
  private readonly EASTER_STRING_LENGTH: number = 6;
  private readonly DAY_OFFSET_START_INDEX: number = 6;
  private readonly DAY_OFFSET_END_INDEX: number = 9;
  private readonly MONTH_START_INDEX: number = 0;
  private readonly MONTH_END_INDEX: number = 2;
  private readonly DAY_START_INDEX: number = 3;
  private readonly DAY_END_INDEX: number = 5;
  private readonly MS_IN_A_DAY = 24 * 60 * 60 * 1000;

  private _list: ICalendarRule[] = [];
  public holidayList: HolidayDate[] = [];

  public get currentYear(): number {
    return this.yearNumber;
  }
  public set currentYear(value: number) {
    this.yearNumber = value;
  }

  public add(value: ICalendarRule) {
    this._list.push(value);
  }

  public addRange(values: ICalendarRule[]) {
    this._list.push(...values);
  }

  public remove(Index: number) {
    this._list.splice(Index, 1);
  }

  public item(Index: number): ICalendarRule {
    return this._list[Index];
  }

  public list(): ICalendarRule[] {
    return this._list;
  }

  public count(): number {
    return this._list.length;
  }

  public clear() {
    this._list = [];
  }

  public computeHolidays() {
    this.holidayList = [];

    if (this._list.length === 0) return;

    let easterDate: Date;
    let ruleString: string;

    easterDate = this.easter(this.currentYear);

    for (let i = 0; i < this.count(); i++) {
      const item: ICalendarRule = this.item(i);
      ruleString = item.rule!;
      const c = new HolidayDate();
      c.currentName = item.name!;
      c.currentDate = this.convertDate(
        easterDate,
        this.currentYear,
        ruleString
      );
      c.officially = item.isMandatory;
      c.formatDate = this.formatDate(c.currentDate);

      if (item.subRule) this.subRules(item.subRule, c);

      this.holidayList.push(c);
    }

    this.holidayList.sort(
      (a, b) => a.currentDate.getTime() - b.currentDate.getTime()
    );
  }

  private subRules(rules: string, item: HolidayDate) {
    let rule: string[];
    let zWtg: number;
    let aWtg: number;
    let nbr: number;

    rule = rules.split(';');

    for (let i = 0; i < rule.length; i++) {
      aWtg = item.currentDate.getDay() + 1;
      zWtg =
        Math.ceil(this.WEEKDAY_NAME.indexOf(rule[i].substring(0, 2)) / 2) + 1;

      nbr = Number.parseInt(rule[i].substring(3, rule[i].length - 3));

      if (aWtg === zWtg && nbr > 0) {
        if (rule[i].substring(2, 1) == '+')
          item.currentDate = new Date(
            item.currentDate.getFullYear(),
            item.currentDate.getMonth(),
            item.currentDate.getDate() + nbr
          );
        else if (rule[i].substring(2, 1) == '-')
          item.currentDate = new Date(
            item.currentDate.getFullYear(),
            item.currentDate.getMonth(),
            item.currentDate.getDate() - nbr
          );
      }
    }
  }

  private easter(currentYear: number): Date {
    // Calculation of the Easter date for the given year according to the Gaussian Easter formula

    const goldenNumber = currentYear % 19;
    const century = Math.floor(currentYear / 100);
    const epactOffset = Math.floor((8 * century + 13) / 25);
    const leapCenturyCorrection = century / 4;
    const fixedConstantM =
      (15 - epactOffset + century - leapCenturyCorrection) % 30;
    const fixedConstantN = (4 + century - leapCenturyCorrection) % 7;
    const moonParameter = (19 * goldenNumber + fixedConstantM) % 30;
    const weekParameter =
      (2 * (currentYear % 4) +
        4 * (currentYear % 7) +
        6 * moonParameter +
        fixedConstantN) %
      7;

    let day = 22 + moonParameter + weekParameter;
    let month: number;

    if (day <= 31) {
      month = 3; // March
    } else {
      day = moonParameter + weekParameter - 9;
      month = 4; // April
    }

    // Special rules for certain years
    if (day === 26) {
      day = 19;
    } else if (
      day === 25 &&
      moonParameter === 28 &&
      weekParameter === 6 &&
      goldenNumber > 10
    ) {
      day = 18;
    }

    return new Date(currentYear, month - 1, day);
  }

  public getISO8601WeekNumber(inputDate: Date): number {
    const date = new Date(inputDate);

    date.setDate(date.getDate() + 4 - (date.getDay() || 7));

    const thursday = date.getTime();

    date.setMonth(0);
    date.setDate(1);
    const jan1st = date.getTime();

    const days = Math.round((thursday - jan1st) / this.MS_IN_A_DAY);

    return Math.floor(days / 7) + 1;
  }

  formatDate(date: Date): string {
    const currentDate = moment(date).format('DDD DD.MMM.YYYY');

    return currentDate;
  }

  public isHoliday(currentDate: Date): HolidayStatus {
    if (!this.holidayList || this.holidayList.length === 0) {
      return HolidayStatus.NotAHoliday;
    }

    const holidayFound = this.holidayList.find(
      (x) => x.currentDate.getTime() === currentDate.getTime()
    );

    if (holidayFound) {
      return holidayFound.officially
        ? HolidayStatus.OfficialHoliday
        : HolidayStatus.UnofficialHoliday;
    }

    return HolidayStatus.NotAHoliday;
  }

  public holidayInfo(currentDate: Date): HolidayDate | undefined {
    if (!this.holidayList || this.holidayList.length === 0) {
      return undefined;
    }

    return this.holidayList.find(
      (x) => x.currentDate.getTime() === currentDate.getTime()
    );
  }

  public daysIntoYear(date: Date): number {
    const msFromStartOfYear =
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0);
    return msFromStartOfYear / this.MS_IN_A_DAY;
  }

  private convertDate(
    easterDate: Date,
    currentYear: number,
    ruleString: string
  ): Date {
    let calcDate: Date;
    let dayOfWeek: number;
    let alternativeDayOfWeek: number;
    let ruleToken: string;

    if (
      ruleString.substring(0, this.EASTER_STRING_LENGTH) === this.EASTER_STRING
    ) {
      calcDate = this.calcEasternRelatedDate(easterDate, ruleString);
    } else {
      const month: number = Number.parseInt(
        ruleString.substring(this.MONTH_START_INDEX, this.MONTH_END_INDEX)
      );
      const day: number = Number.parseInt(
        ruleString.substring(this.DAY_START_INDEX, this.DAY_END_INDEX)
      );
      calcDate = new Date(currentYear, month - 1, day);

      if (ruleString.length > 5) {
        dayOfWeek = this.calcDayOfWeek(ruleString);
        alternativeDayOfWeek = calcDate.getDay() + 1;

        ruleToken = ruleString.substring(8, 9);

        if (dayOfWeek !== alternativeDayOfWeek) {
          calcDate = this.constructedDate(
            calcDate,
            ruleToken,
            dayOfWeek,
            alternativeDayOfWeek
          );
        }
        calcDate = this.addDays(
          calcDate,
          Number.parseInt(ruleString.substring(5, 8))
        );
      }
    }

    return calcDate;
  }

  private calcDayOfWeek(ruleString: string): number {
    const weekOfDayName = ruleString.substring(9, 11);
    return Math.ceil(this.WEEKDAY_NAME.indexOf(weekOfDayName) / 2) + 1;
  }

  private constructedDate(
    calcDate: Date,
    ruleToken: string,
    dayOfWeek: number,
    alternativeDayOfWeek: number
  ): Date {
    let l: number;

    if (ruleToken === '+' || ruleToken === '&') {
      l = dayOfWeek - alternativeDayOfWeek;
      calcDate = this.addDays(calcDate, l);

      if (l < 0) calcDate = this.addDays(calcDate, 7);
      if (ruleToken == '&') calcDate = this.addDays(calcDate, -7);
    } else {
      l = alternativeDayOfWeek - dayOfWeek;
      if (l < 0) calcDate = this.addDays(calcDate, l * -1 + 7);
      else calcDate = this.addDays(calcDate, l * -1);
    }
    return calcDate;
  }
  private calcEasternRelatedDate(easterDate: Date, ruleString: string): Date {
    let calcDate: Date;
    let dayOfWeek: number;
    let alternativeDayOfWeek: number;
    let differenceDays: number;

    const tmpDay: number = Number.parseInt(
      ruleString.substring(
        this.DAY_OFFSET_START_INDEX,
        this.DAY_OFFSET_END_INDEX
      )
    );
    if (!Number.isNaN(tmpDay)) calcDate = this.addDays(easterDate, tmpDay);
    else calcDate = easterDate;

    if (ruleString.length > this.DAY_OFFSET_END_INDEX) {
      dayOfWeek =
        Math.ceil(
          this.WEEKDAY_NAME.indexOf(
            ruleString.substring(this.DAY_OFFSET_END_INDEX + 1, 2)
          ) / 2
        ) + 1;
      alternativeDayOfWeek = calcDate.getDay() + 1;

      if (ruleString.substring(this.DAY_OFFSET_END_INDEX, 1) == '+') {
        differenceDays = dayOfWeek - alternativeDayOfWeek + 7;
      } else {
        differenceDays = dayOfWeek - alternativeDayOfWeek - 7;
      }

      calcDate = this.addDays(calcDate, differenceDays);
    }
    return calcDate;
  }

  private addDays(date: Date | string, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  public getTotalDaysInCurrentYear(): number {
    return this.isLeapYear(this.currentYear) ? 366 : 365;
  }

  public getDaysInMonth(currentMonth: number, currentYear: number): number {
    switch (currentMonth) {
      case 4:
      case 6:
      case 9:
      case 11:
        return 30;
      case 1:
      case 3:
      case 5:
      case 7:
      case 8:
      case 10:
      case 12:
        return 31;
      case 2:
        return this.isLeapYear(currentYear) ? 29 : 28;
      default:
        throw new Error('Invalid month');
    }
  }

  public isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }
}

export class HolidayDate {
  public currentDate = new Date(0);
  public currentName?: MultiLanguage | undefined = undefined;
  public officially = false;
  public formatDate = '';
  public description = '';
}
