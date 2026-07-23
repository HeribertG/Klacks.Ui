// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Verifies the client-side holiday computation honors the per-calendar
 * official override, mirroring the backend derivation `override ?? isMandatory`.
 * @param mockDataCalendarRule - Stub returning the global calendar-rule list
 */
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import {
  HolidayCollectionService,
  OfficialOverrideMap,
  buildOfficialOverrideKey,
} from './holiday-collection.service';
import { DataCalendarRuleService } from 'src/app/infrastructure/api/calendar/data-calendar-rule.service';
import {
  CalendarRule,
  ICalendarRule,
  StateCountryToken,
} from 'src/app/domain/models/calendar/calendar-rule-class';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';

function makeRule(
  country: string,
  state: string,
  isMandatory: boolean,
  ruleString: string,
  nameEn: string
): ICalendarRule {
  const rule = new CalendarRule();
  rule.country = country;
  rule.state = state;
  rule.isMandatory = isMandatory;
  rule.rule = ruleString;
  rule.name = Object.assign(new MultiLanguage(), { en: nameEn });
  return rule;
}

function makeToken(country: string, state: string): StateCountryToken {
  const token = new StateCountryToken();
  token.country = country;
  token.state = state;
  return token;
}

describe('HolidayCollectionService official override', () => {
  let service: HolidayCollectionService;
  let usRule: ICalendarRule;
  let deRule: ICalendarRule;
  let mockDataCalendarRule: any;

  const usToken = makeToken('US', 'US');
  const deToken = makeToken('DE', 'DE');

  beforeEach(async () => {
    usRule = makeRule('US', 'US', true, '07/04', 'US Day');
    deRule = makeRule('DE', 'DE', false, '12/25', 'DE Day');

    mockDataCalendarRule = {
      readCalendarRuleList: vi.fn().mockReturnValue(of([usRule, deRule])),
    };

    TestBed.configureTestingModule({
      providers: [
        HolidayCollectionService,
        { provide: DataCalendarRuleService, useValue: mockDataCalendarRule },
      ],
    });

    service = TestBed.inject(HolidayCollectionService);
    await service.readDataAsync();
  });

  function officiallyFor(nameEn: string): boolean[] {
    return service.holidays.holidayList
      .filter((h) => h.currentName?.en === nameEn)
      .map((h) => h.officially);
  }

  it('downgrades a mandatory holiday to unofficial when override is false', () => {
    const overrides: OfficialOverrideMap = new Map([
      [buildOfficialOverrideKey('US', 'US'), false],
    ]);

    service.setSelection([usToken], overrides);

    const flags = officiallyFor('US Day');
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((x) => x === false)).toBe(true);
  });

  it('upgrades a non-mandatory holiday to official when override is true', () => {
    const overrides: OfficialOverrideMap = new Map([
      [buildOfficialOverrideKey('DE', 'DE'), true],
    ]);

    service.setSelection([deToken], overrides);

    const flags = officiallyFor('DE Day');
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((x) => x === true)).toBe(true);
  });

  it('inherits the rule flag when override is null', () => {
    const overrides: OfficialOverrideMap = new Map([
      [buildOfficialOverrideKey('US', 'US'), null],
    ]);

    service.setSelection([usToken], overrides);

    expect(officiallyFor('US Day').every((x) => x === true)).toBe(true);
  });

  it('inherits the rule flag when no override map is provided', () => {
    service.setSelection([usToken, deToken]);

    expect(officiallyFor('US Day').every((x) => x === true)).toBe(true);
    expect(officiallyFor('DE Day').every((x) => x === false)).toBe(true);
  });

  it('does not mutate the shared rule objects when applying an override', () => {
    const overrides: OfficialOverrideMap = new Map([
      [buildOfficialOverrideKey('US', 'US'), false],
    ]);

    service.setSelection([usToken], overrides);

    expect(usRule.isMandatory).toBe(true);
  });
});
