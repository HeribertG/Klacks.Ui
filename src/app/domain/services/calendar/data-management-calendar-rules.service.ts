// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  CalendarRule,
  CalendarRulesFilter,
  StateCountryToken,
  ICalendarRule,
  TruncatedCalendarRule,
} from 'src/app/domain/models/calendar/calendar-rule-class';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DataCalendarRuleService } from 'src/app/infrastructure/api/calendar/data-calendar-rule.service';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementCalendarRulesService {
  public dataCalendarRuleService = inject(DataCalendarRuleService);
  private eventBus = inject(EVENT_BUS_TOKEN);

  public isRead = signal(false);
  public isPageRead = signal(false);

  public maxItems = 0;
  public firstItem = 0;

  public listWrapper: TruncatedCalendarRule | undefined;

  public selectedCountry = '';
  public currentFilter: CalendarRulesFilter = new CalendarRulesFilter();
  public filteredRulesToken: StateCountryToken[] = [];

  private currentFilterDummy: CalendarRulesFilter | undefined;
  private temporaryFilterDummy: CalendarRulesFilter | undefined;

  /* #region   temporary check is Filter dirty */
  public init(): void {
    this.dataCalendarRuleService.readRuleTokenList(true)
      .subscribe((x) => {
        this.currentFilter.list = x;
        this.filteredRulesToken = x;
        this.currentFilter.countries = Array.from(
          new Set(x.map((x) => x.country))
        );
        this.isRead.set(true);
        resetSignalAfterDelay(this.isRead);
      });
  }
  public setTemporaryFilter(): void {
    this.temporaryFilterDummy = cloneObject<CalendarRulesFilter>(
      this.currentFilter
    );
  }

  public isTemoraryFilter_Dirty(): boolean {
    const a = this.currentFilter as CalendarRulesFilter;
    const b = this.temporaryFilterDummy as CalendarRulesFilter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  /* #endregion   temporary check is Filter dirty */

  selectStates(country: string, valueState: boolean) {
    let res: StateCountryToken[] = [];
    if (country === '') {
      res = this.filteredRulesToken;
    } else {
      res = this.filteredRulesToken.filter((x) => x.country === country);
    }
    res.forEach((y) => {
      y.select = valueState;
      this.setValue(y);
    });
  }

  filterStatesByCountries(country: string) {
    if (country === '') {
      this.filteredRulesToken = this.currentFilter.list;
    } else {
      this.filteredRulesToken = this.currentFilter.list.filter(
        (x) => x.country === country
      );
    }
  }

  setValue(value: StateCountryToken): void {
    const index = this.currentFilter.list.findIndex(
      (x) => x.state === value.state && x.country === value.country
    );
    if (index === -1) {
      return;
    }
    this.currentFilter.list[index].select = value.select;
  }

  readPage(language: string) {
    this.currentFilter.language = language;
    this.dataCalendarRuleService
      .readTruncatedCalendarRule(this.currentFilter)
      .subscribe((x: TruncatedCalendarRule | undefined) => {
        if (x) {
          this.listWrapper = x;
          if (this.isFilter_Dirty()) {
            this.currentFilterDummy = cloneObject<CalendarRulesFilter>(
              this.currentFilter
            );
          }

          this.maxItems = x.maxItems;
          this.firstItem = x.firstItemOnPage;
          this.isPageRead.set(true);
          resetSignalAfterDelay(this.isPageRead);
        }
      });
  }

  deleteCalendarRule(id: string, language: string): void {
    lastValueFrom(this.dataCalendarRuleService.deleteCalendarRule(id))
      .then(() => {
        this.readPage(language);
      })
      .catch(() => {
        this.eventBus.emit(DomainEventType.ERROR, { message: DomainMessages.UNKNOWN_ERROR, code: 'CalendarRuleError', context: 'DataManagementCalendarRulesService' });
      });
  }

  addCalendarRule(item: CalendarRule, language: string): void {
    lastValueFrom(this.dataCalendarRuleService.addCalendarRule(item))
      .then(() => {
        this.readPage(language);
      })
      .catch(() => {
        this.eventBus.emit(DomainEventType.ERROR, { message: DomainMessages.UNKNOWN_ERROR, code: 'CalendarRuleError', context: 'DataManagementCalendarRulesService' });
      });
  }

  updateCalendarRule(item: ICalendarRule, language: string): void {
    lastValueFrom(this.dataCalendarRuleService.updateCalendarRule(item)).then(
      () => {
        this.readPage(language);
      }
    );
  }

  async loadRuleTokens(): Promise<StateCountryToken[]> {
    const tokens = await lastValueFrom(
      this.dataCalendarRuleService.readRuleTokenList(false)
    );
    return tokens ?? [];
  }

  readCalendarRuleList(value: boolean): void {
    this.dataCalendarRuleService.readRuleTokenList(value)
      .subscribe((x) => {
        this.currentFilter.list = x;
      });
  }

  exportExcel() {}

  private isFilter_Dirty(): boolean {
    const a = this.currentFilter as CalendarRulesFilter;
    const b = this.currentFilterDummy as CalendarRulesFilter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }
}
