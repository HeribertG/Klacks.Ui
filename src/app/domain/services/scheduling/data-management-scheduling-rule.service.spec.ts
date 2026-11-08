// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { DataManagementSchedulingRuleService } from './data-management-scheduling-rule.service';
import { SchedulingRuleApiService } from 'src/app/infrastructure/api/scheduling/scheduling-rule-api.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { SchedulingDefaultSettings } from 'src/app/domain/models/settings/scheduling-default-settings.model';
import { WorkSettings } from 'src/app/domain/models/settings/work-settings.model';
import { SurchargeModeSettings } from 'src/app/domain/models/settings/surcharge-mode-settings.model';
import { ISchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.interface';

describe('DataManagementSchedulingRuleService.createRule and validateRule', () => {
  let service: DataManagementSchedulingRuleService;

  beforeEach(() => {
    const schedulingDefaults = new SchedulingDefaultSettings();
    schedulingDefaults.workOnMonday = true;
    schedulingDefaults.workOnSaturday = false;
    schedulingDefaults.performsShiftWork = false;

    const mockSettings = {
      appSettings: {
        schedulingDefaultSettings: () => schedulingDefaults,
        workSettings: () => new WorkSettings(),
        surchargeModeSettings: () => new SurchargeModeSettings(),
      },
      nightRateRaw: null,
      holidayRateRaw: null,
      saRateRaw: null,
      soRateRaw: null,
    };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        DataManagementSchedulingRuleService,
        { provide: SchedulingRuleApiService, useValue: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } },
        { provide: EVENT_BUS_TOKEN, useValue: { publish: vi.fn(), on: vi.fn() } },
        { provide: DataManagementSettingsService, useValue: mockSettings },
      ],
    });

    service = TestBed.inject(DataManagementSchedulingRuleService);
  });

  it('leaves every weekday flag unset so the contract keeps deciding', () => {
    const rule = service.createRule();

    expect(rule.workOnMonday).toBeNull();
    expect(rule.workOnTuesday).toBeNull();
    expect(rule.workOnWednesday).toBeNull();
    expect(rule.workOnThursday).toBeNull();
    expect(rule.workOnFriday).toBeNull();
    expect(rule.workOnSaturday).toBeNull();
    expect(rule.workOnSunday).toBeNull();
  });

  it('leaves performsShiftWork unset', () => {
    expect(service.createRule().performsShiftWork).toBeNull();
  });

  it('still pre-fills the numeric defaults from the company settings', () => {
    const rule = service.createRule();

    expect(rule.maxDailyHours).toBe(new SchedulingDefaultSettings().schedulingMaxDailyHours);
    expect(rule.maxConsecutiveDays).toBe(new SchedulingDefaultSettings().schedulingMaxConsecutiveDays);
  });

  it.each([
    ['maxDailyHours', 0],
    ['maxWeeklyHours', 0],
    ['maxConsecutiveDays', 0],
    ['maxDailyHours', 0.5],
  ] as const)('rejects a cap %s of %s because a cap is never 0', (field, value) => {
    const rule: ISchedulingRule = { ...service.createRule(), name: 'Rule' };
    rule[field] = value;

    expect(service.validateRule(rule)).toContain('setting.schedulingRule.validation.capAtLeastOne');
  });

  it('accepts empty caps, caps of 1 and rest minimums of 0', () => {
    const rule = {
      ...service.createRule(),
      name: 'Rule',
      maxDailyHours: null,
      maxWeeklyHours: 1,
      maxConsecutiveDays: 1,
      minPauseHours: 0,
      minRestDays: 0,
    };

    expect(service.validateRule(rule)).toEqual([]);
  });
});
