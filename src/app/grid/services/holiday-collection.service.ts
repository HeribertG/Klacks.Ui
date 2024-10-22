import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import {
  PossibleHolidayRuleWrapper,
  PossibleHolidayRule,
  StateCountryToken,
  HolidaysListHelper,
  ICalendarRule,
} from 'src/app/core/calendar-rule-class';
import { DataCalendarRuleService } from 'src/app/data/data-calendar-rule.service';

@Injectable({
  providedIn: 'root',
})
export class HolidayCollectionService {
  public isReset = signal(false);
  holidays = new HolidaysListHelper();

  possibleHolidayRule = new PossibleHolidayRuleWrapper();

  constructor(private dataCalendarRule: DataCalendarRuleService) {
    this.holidays.currentYear = new Date().getFullYear();
  }

  get currentYear(): number {
    return this.holidays.currentYear;
  }
  set currentYear(value: number) {
    this.holidays.currentYear = value;
    this.holidays.computeHolidays();
    this.isReset.set(true);
    setTimeout(() => this.isReset.set(false), 100);
  }

  readData() {
    this.dataCalendarRule.readCalendarRuleList().subscribe((rules) => {
      this.possibleHolidayRule.clear;
      if (rules) {
        rules.forEach((rule) => {
          var item = new PossibleHolidayRule();
          item.country = rule.country;
          item.state = rule.state;
          item.rule = rule;
          this.possibleHolidayRule.add(item);
        });
      }
    });
  }

  setSelection(values: StateCountryToken[]): void {
    this.possibleHolidayRule.setFilter(values);
    this.holidays.clear();
    const rules = this.possibleHolidayRule.getFilterData().map((x) => x.rule);
    if (rules) {
      this.holidays.addRange(rules as ICalendarRule[]);
    }
    this.holidays.computeHolidays();
    this.isReset.set(true);
    setTimeout(() => this.isReset.set(false), 100);
  }

  selection(): PossibleHolidayRule[] {
    return this.possibleHolidayRule.getFilterData();
  }
}
