// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import {
  PossibleHolidayRuleWrapper,
  PossibleHolidayRule,
  StateCountryToken,
  HolidaysListHelper,
  ICalendarRule,
} from 'src/app/domain/models/calendar/calendar-rule-class';
import { DataCalendarRuleService } from 'src/app/infrastructure/api/calendar/data-calendar-rule.service';
import { firstValueFrom } from 'rxjs';

const OVERRIDE_KEY_SEPARATOR = '|';

export type OfficialOverrideMap = Map<string, boolean | null>;

export function buildOfficialOverrideKey(
  country: string,
  state: string
): string {
  return `${country}${OVERRIDE_KEY_SEPARATOR}${state}`;
}

@Injectable()
export class HolidayCollectionService {
  private dataCalendarRule = inject(DataCalendarRuleService);

  public isReset = signal(false);
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
    this.isReset.set(false);
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

  async readDataAsync(): Promise<void> {
    const rules = await firstValueFrom(
      this.dataCalendarRule.readCalendarRuleList()
    );
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
  }

  setSelection(
    values: StateCountryToken[],
    overrides?: OfficialOverrideMap
  ): void {
    this.isReset.set(false);
    this.possibleHolidayRule.setFilter(values);
    this.holidays.clear();
    const rules = this.possibleHolidayRule.getFilterData().map((x) => x.rule);
    if (rules) {
      this.holidays.addRange(
        this.applyOfficialOverrides(rules as ICalendarRule[], overrides)
      );
    }
    this.computeHolidays();
  }

  private applyOfficialOverrides(
    rules: ICalendarRule[],
    overrides?: OfficialOverrideMap
  ): ICalendarRule[] {
    if (!overrides || overrides.size === 0) {
      return rules;
    }
    return rules.map((rule) => {
      const override = overrides.get(
        buildOfficialOverrideKey(rule.country, rule.state)
      );
      const effectiveMandatory = override ?? rule.isMandatory;
      if (effectiveMandatory === rule.isMandatory) {
        return rule;
      }
      return { ...rule, isMandatory: effectiveMandatory };
    });
  }

  selection(): PossibleHolidayRule[] {
    return this.possibleHolidayRule.getFilterData();
  }

  private computeHolidays() {
    this.holidays.computeHolidays();

    setTimeout(() => {
      this.isReset.set(true);
    }, HolidayCollectionService.WAIT_TIME);
  }
}
