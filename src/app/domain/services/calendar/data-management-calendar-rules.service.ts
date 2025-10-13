import { inject, Injectable, signal } from '@angular/core';
import { lastValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  CalendarRule,
  CalendarRulesFilter,
  StateCountryToken,
  ICalendarRule,
  TruncatedCalendarRule,
} from 'src/app/domain/models/calendar-rule-class';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/domain/helpers/object-helpers';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { EventBus } from 'src/app/application/services/event-bus.service';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DataCalendarRuleService } from 'src/app/infrastructure/api/data-calendar-rule.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementCalendarRulesService {
  public dataCalendarRuleService = inject(DataCalendarRuleService);
  private eventBus = inject(EventBus);
  private destroy$ = new Subject<void>();

  public isRead = signal(false);

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
      .pipe(takeUntil(this.destroy$))
      .subscribe((x) => {
        this.currentFilter.list = x;
        this.filteredRulesToken = x;
        this.currentFilter.countries = Array.from(
          new Set(x.map((x) => x.country))
        );
        this.isRead.set(true);
        setTimeout(() => this.isRead.set(false), 100);
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
      .pipe(takeUntil(this.destroy$))
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

  readCalendarRuleList(value: boolean): void {
    this.dataCalendarRuleService.readRuleTokenList(value)
      .pipe(takeUntil(this.destroy$))
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

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
