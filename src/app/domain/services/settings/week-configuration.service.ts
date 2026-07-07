// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Single source of truth for "is this day a weekend day" and "where does the week start",
 * sourced from AppSettingsManagementService's CALENDAR_WEEKEND_DAYS / CALENDAR_WEEK_START_DAY
 * settings. Consumed by Schedule, Gantt, Availability, Address and Automation modules so they
 * all agree on the same configuration instead of each hard-coding Saturday/Sunday/Monday.
 */
import { Injectable, inject, computed } from '@angular/core';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { addDays } from 'src/app/shared/helpers/date.helper';
import { DAY_NAME_TO_JS_DAY } from 'src/app/domain/constants/day-of-week.constants';

const DEFAULT_WEEK_START_JS_DAY = 1; // Monday

@Injectable({ providedIn: 'root' })
export class WeekConfigurationService {
  private appSettings = inject(AppSettingsManagementService);

  public weekendDays = computed<Set<number>>(() => {
    const names = this.appSettings.schedulingDefaultSettings().weekendDays;
    return new Set(names.map((name) => DAY_NAME_TO_JS_DAY[name]).filter((d) => d !== undefined));
  });

  public weekStartDay = computed<number>(() => {
    const name = this.appSettings.schedulingDefaultSettings().weekStartDay;
    return DAY_NAME_TO_JS_DAY[name] ?? DEFAULT_WEEK_START_JS_DAY;
  });

  /**
   * The configured weekend days ordered by ISO weekday (Monday=1..Sunday=7), mirroring the
   * backend's WeekendDay1/WeekendDay2 ordering, so the 1st/2nd configured weekend day can be
   * mapped to the two legacy "Saturday-colored"/"Sunday-colored" rendering slots without an
   * enum rename.
   */
  private orderedWeekendDays = computed<number[]>(() =>
    [...this.weekendDays()].sort((a, b) => toIsoWeekday(a) - toIsoWeekday(b))
  );

  isWeekend(date: Date): boolean {
    return this.weekendDays().has(date.getDay());
  }

  /**
   * Returns 1 if the date is the 1st configured weekend day (renders in the legacy "Saturday"
   * color slot), 2 if it's the 2nd (legacy "Sunday" slot), or null if it's not a weekend day.
   * A 3rd configured weekend day (if any) is treated as slot 2 — a documented limitation shared
   * with the backend surcharge macros.
   */
  getWeekendSlot(date: Date): 1 | 2 | null {
    const ordered = this.orderedWeekendDays();
    const index = ordered.indexOf(date.getDay());
    if (index === -1) {
      return null;
    }
    return index === 0 ? 1 : 2;
  }

  getWeekStart(date: Date): Date {
    const offset = (date.getDay() - this.weekStartDay() + 7) % 7;
    return addDays(date, -offset);
  }
}

function toIsoWeekday(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}
