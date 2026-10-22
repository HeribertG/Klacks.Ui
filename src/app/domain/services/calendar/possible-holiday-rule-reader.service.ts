// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads the global calendar-rule list and shapes every rule into a selectable PossibleHolidayRule keyed by its country
 * and state; a missing list yields no rules.
 */

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ICalendarRule } from 'src/app/domain/models/calendar/calendar-rule.interface';
import { PossibleHolidayRule } from 'src/app/domain/models/calendar/possible-holiday-rule-class';
import { DataCalendarRuleService } from 'src/app/infrastructure/api/calendar/data-calendar-rule.service';

@Injectable({ providedIn: 'root' })
export class PossibleHolidayRuleReaderService {
  private dataCalendarRule = inject(DataCalendarRuleService);

  readPossibleHolidayRules(): Observable<PossibleHolidayRule[]> {
    return this.dataCalendarRule
      .readCalendarRuleList()
      .pipe(map((rules) => (rules ?? []).map((rule) => PossibleHolidayRuleReaderService.toPossibleHolidayRule(rule))));
  }

  private static toPossibleHolidayRule(rule: ICalendarRule): PossibleHolidayRule {
    const item = new PossibleHolidayRule();
    item.country = rule.country;
    item.state = rule.state;
    item.rule = rule;
    return item;
  }
}
