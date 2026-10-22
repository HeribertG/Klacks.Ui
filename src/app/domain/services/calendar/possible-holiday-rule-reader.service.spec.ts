// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { ICalendarRule } from 'src/app/domain/models/calendar/calendar-rule.interface';
import { DataCalendarRuleService } from 'src/app/infrastructure/api/calendar/data-calendar-rule.service';
import { PossibleHolidayRuleReaderService } from './possible-holiday-rule-reader.service';

describe('PossibleHolidayRuleReaderService', () => {
  let service: PossibleHolidayRuleReaderService;
  let readCalendarRuleList: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    readCalendarRuleList = vi.fn();
    TestBed.configureTestingModule({
      providers: [PossibleHolidayRuleReaderService, { provide: DataCalendarRuleService, useValue: { readCalendarRuleList } }],
    });
    service = TestBed.inject(PossibleHolidayRuleReaderService);
  });

  it('shapes every rule into an unselected possible rule keyed by country and state', async () => {
    const rule = { country: 'CH', state: 'BE' } as ICalendarRule;
    readCalendarRuleList.mockReturnValue(of([rule]));

    const items = await firstValueFrom(service.readPossibleHolidayRules());

    expect(items).toHaveLength(1);
    expect(items[0].country).toBe('CH');
    expect(items[0].state).toBe('BE');
    expect(items[0].rule).toBe(rule);
    expect(items[0].selected).toBe(false);
  });

  it('yields no rules for a missing list', async () => {
    readCalendarRuleList.mockReturnValue(of(null));

    await expect(firstValueFrom(service.readPossibleHolidayRules())).resolves.toEqual([]);
  });
});
