// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Holds the list of possible holiday rules and marks the ones matching the selected country/state tokens.
 * @param tokens - Country/state tokens whose holiday rules become selected
 */

import { PossibleHolidayRule } from './possible-holiday-rule-class';
import { ICalendarRule } from './calendar-rule.interface';
import { StateCountryToken } from './state-country-token-class';

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
