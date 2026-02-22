// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  CalendarRulesFilter,
  StateCountryToken,
  ICalendarRule,
  TruncatedCalendarRule,
} from 'src/app/domain/models/calendar/calendar-rule-class';

@Injectable({
  providedIn: 'root',
})
export class DataCalendarRuleService {
  private httpClient = inject(HttpClient);

  readCalendarRule(id: string) {
    return this.httpClient
      .get<ICalendarRule>(`${environment.baseUrl}CalendarRules/CalendarRule/` + id)
      .pipe(retry(3));
  }

  updateCalendarRule(value: ICalendarRule) {
    return this.httpClient
      .put<ICalendarRule>(`${environment.baseUrl}CalendarRules/CalendarRule/`, value)
      .pipe(retry(3));
  }

  addCalendarRule(value: ICalendarRule) {
    delete value.id;
    return this.httpClient
      .post<ICalendarRule>(
        `${environment.baseUrl}CalendarRules/CalendarRule/`,
        value
      )
      .pipe(retry(3));
  }

  readCalendarRuleList() {
    return this.httpClient
      .get<ICalendarRule[]>(
        `${environment.baseUrl}CalendarRules/GetCalendarRuleList`
      )
      .pipe(retry(3));
  }

  readRuleTokenList(value: boolean) {
    return this.httpClient
      .get<StateCountryToken[]>(
        `${environment.baseUrl}CalendarRules/GetRuleTokenList?isSelected=` + value
      )
      .pipe(retry(3));
  }

  readTruncatedCalendarRule(filter: CalendarRulesFilter) {
    return this.httpClient
      .post<TruncatedCalendarRule>(
        `${environment.baseUrl}CalendarRules/GetSimpleCalendarRuleList`,
        filter
      )
      .pipe();
  }

  deleteCalendarRule(id: string) {
    return this.httpClient
      .delete<ICalendarRule>(
        `${environment.baseUrl}CalendarRules/CalendarRule/` + id
      )
      .pipe(retry(3));
  }
}
