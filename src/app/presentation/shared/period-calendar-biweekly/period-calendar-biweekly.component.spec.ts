// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { PeriodCalendarBiweeklyComponent } from './period-calendar-biweekly.component';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { PeriodResetData } from '../period-calendar-monthly/period-reset-data.interface';

describe('PeriodCalendarBiweeklyComponent', () => {
  let component: PeriodCalendarBiweeklyComponent;
  let emitted: PeriodResetData[];

  const create = (year: number, week: number) => {
    TestBed.configureTestingModule({
      imports: [PeriodCalendarBiweeklyComponent, TranslateModule.forRoot()],
      providers: [{ provide: WeekConfigurationService, useValue: { weekStartDay: signal(1) } }],
    });
    const fixture = TestBed.createComponent(PeriodCalendarBiweeklyComponent);
    component = fixture.componentInstance;
    component.year = year;
    component.week = week;
    emitted = [];
    component.periodChanged.subscribe((data) => emitted.push(data));
    component.ngOnInit();
  };

  it('offers the real pay periods of 2026, ending with the period 53 - 1 across the year end', () => {
    create(2026, 51);

    expect(component.biweeklyOptions).toHaveLength(27);
    expect(component.biweeklyOptions[0]).toEqual({ startWeek: 1, label: '1 - 2' });
    expect(component.biweeklyOptions[26]).toEqual({ startWeek: 53, label: '53 - 1' });
    expect(emitted).toEqual([{ year: 2026, week: 51 }]);
  });

  it('starts the options of 2027 with week 2, because week 1 belongs to the period that started in 2026', () => {
    create(2027, 2);

    expect(component.biweeklyOptions.map((option) => option.startWeek).slice(0, 3)).toEqual([2, 4, 6]);
    expect(component.biweeklyOptions[component.biweeklyOptions.length - 1].startWeek).toBe(52);
  });

  it('snaps a week stored by the former odd-week rule onto the period that contains it', () => {
    create(2027, 1);

    expect(component.year).toBe(2026);
    expect(component.week).toBe(53);
    expect(emitted).toEqual([{ year: 2026, week: 53 }]);
  });

  it('keeps a valid start week when the year changes, otherwise takes the containing option', () => {
    create(2026, 53);

    component.changeYear(2027);

    expect(component.week).toBe(52);
    expect(emitted[emitted.length - 1]).toEqual({ year: 2027, week: 52 });

    component.changeYear(2028);
    expect(component.week).toBe(52);
  });
});
