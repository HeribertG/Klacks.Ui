import { inject, Injectable, signal } from '@angular/core';
import {
  PossibleHolidayRuleWrapper,
  PossibleHolidayRule,
  StateCountryToken,
  HolidaysListHelper,
  ICalendarRule,
} from 'src/app/domain/models/calendar-rule-class';
import { DataCalendarRuleService } from 'src/app/infrastructure/api/data-calendar-rule.service';

@Injectable()
export class HolidayCollectionService {
  private dataCalendarRule = inject(DataCalendarRuleService);

  private _isReset = signal(false);
  get isReset(): boolean { return this._isReset(); }
  public holidays = new HolidaysListHelper();
  public possibleHolidayRule = new PossibleHolidayRuleWrapper();

  private static readonly WAIT_TIME = 100;

  constructor() {
    this.holidays.currentYear = new Date().getFullYear();
  }

  get currentYear(): number {
    return this.holidays.currentYear;
  }
  set currentYear(value: number) {
    this._isReset.set(false);
    this.holidays.currentYear = value;
    this.computeHolidays();
  }

  readData() {
    this.dataCalendarRule.readCalendarRuleList().subscribe((rules) => {
      this.possibleHolidayRule.clear;
      if (rules) {
        rules.forEach((rule) => {
          const item = new PossibleHolidayRule();
          item.country = rule.country;
          item.state = rule.state;
          item.rule = rule;
          this.possibleHolidayRule.add(item);
        });
      }
    });
  }

  setSelection(values: StateCountryToken[]): void {
    this._isReset.set(false);
    this.possibleHolidayRule.setFilter(values);
    this.holidays.clear();
    const rules = this.possibleHolidayRule.getFilterData().map((x) => x.rule);
    if (rules) {
      this.holidays.addRange(rules as ICalendarRule[]);
    }
    this.computeHolidays();
  }

  selection(): PossibleHolidayRule[] {
    return this.possibleHolidayRule.getFilterData();
  }

  private computeHolidays() {
    this.holidays.computeHolidays();

    setTimeout(
      () => this._isReset.set(true),
      HolidayCollectionService.WAIT_TIME
    );
  }
}
