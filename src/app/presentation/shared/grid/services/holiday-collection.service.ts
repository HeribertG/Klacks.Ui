// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { inject, Injectable, signal } from '@angular/core';
import { HolidaysListHelper } from 'src/app/domain/models/calendar/holidays-list-helper-class';
import { PossibleHolidayRuleWrapper } from 'src/app/domain/models/calendar/possible-holiday-rule-wrapper-class';
import { PossibleHolidayRule } from 'src/app/domain/models/calendar/possible-holiday-rule-class';
import { StateCountryToken } from 'src/app/domain/models/calendar/state-country-token-class';
import { ICalendarRule } from 'src/app/domain/models/calendar/calendar-rule.interface';
import { DataCalendarRuleService } from 'src/app/infrastructure/api/calendar/data-calendar-rule.service';
import { firstValueFrom } from 'rxjs';
import { OfficialOverrideMap } from 'src/app/domain/models/calendar/official-override-map.type';
import { buildOfficialOverrideKey } from 'src/app/domain/helpers/official-override-key.helper';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';

@Injectable()
export class HolidayCollectionService {
  private dataCalendarRule = inject(DataCalendarRuleService);

  public isReset = signal(false);
  public holidays = new HolidaysListHelper();
  public possibleHolidayRule = new PossibleHolidayRuleWrapper();

  private static readonly WAIT_TIME = 100;

  constructor() {
    this.holidays.currentYear = companyToday().getFullYear();
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
