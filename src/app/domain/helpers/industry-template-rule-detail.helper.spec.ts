// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { buildSchedulingRuleDetailGroups } from './industry-template-rule-detail.helper';
import { IIndustryTemplateSchedulingRuleEntry } from 'src/app/domain/models/settings/industry-template-scheduling-rule-entry.interface';
import { IIndustryTemplateOvertimeLabels } from 'src/app/domain/models/settings/industry-template-overtime-labels.interface';

describe('buildSchedulingRuleDetailGroups', () => {
  const baseRule: IIndustryTemplateSchedulingRuleEntry = {
    name: 'DE Klinik Standard',
    description: null,
  };
  const noOvertimeLabels: IIndustryTemplateOvertimeLabels = { overtimeBasisLabel: null, overtimeRateModeLabel: null };

  it('returns no groups when no detail fields arrived', () => {
    expect(buildSchedulingRuleDetailGroups(baseRule, noOvertimeLabels)).toEqual([]);
  });

  it('only includes fields that are present, grouped under working time', () => {
    const rule: IIndustryTemplateSchedulingRuleEntry = {
      ...baseRule,
      defaultWorkingHours: 8.5,
      maxDailyHours: null,
      maxWeeklyHours: undefined,
      maxOptimalGap: 2,
    };

    const groups = buildSchedulingRuleDetailGroups(rule, noOvertimeLabels);

    expect(groups).toEqual([
      {
        headingKey: 'setting.activeIndustries.preview.rule.group.workingTime',
        rows: [
          { labelKey: 'setting.schedulingRule.defaultWorkingHours', value: '8.5' },
          { labelKey: 'setting.schedulingRule.maxOptimalGap', value: '2' },
        ],
      },
    ]);
  });

  it('groups rest-time fields separately from working-time fields', () => {
    const rule: IIndustryTemplateSchedulingRuleEntry = { ...baseRule, minRestDays: 2, maxConsecutiveDays: 6 };

    const groups = buildSchedulingRuleDetailGroups(rule, noOvertimeLabels);

    expect(groups).toEqual([
      {
        headingKey: 'setting.activeIndustries.preview.rule.group.restTimes',
        rows: [
          { labelKey: 'setting.schedulingRule.minRestDays', value: '2' },
          { labelKey: 'setting.schedulingRule.maxConsecutiveDays', value: '6' },
        ],
      },
    ]);
  });

  it('formats night/holiday/weekend rates as a signed percentage', () => {
    const rule: IIndustryTemplateSchedulingRuleEntry = {
      ...baseRule,
      nightRate: 0.25,
      holidayRate: -0.1,
      weekend1Rate: 0.5,
    };

    const groups = buildSchedulingRuleDetailGroups(rule, noOvertimeLabels);

    expect(groups[0].rows).toEqual([
      { labelKey: 'setting.schedulingRule.nightRate', value: '+25 %' },
      { labelKey: 'setting.schedulingRule.holidayRate', value: '-10 %' },
      { labelKey: 'setting.activeIndustries.preview.rule.weekend1Rate', value: '+50 %' },
    ]);
  });

  it('formats night start/end times from HH:mm:ss to HH:mm', () => {
    const rule: IIndustryTemplateSchedulingRuleEntry = { ...baseRule, nightStart: '23:00:00', nightEnd: '06:00:00' };

    const groups = buildSchedulingRuleDetailGroups(rule, noOvertimeLabels);

    expect(groups[0].rows).toEqual([
      { labelKey: 'setting.surchargeMode.night-start', value: '23:00' },
      { labelKey: 'setting.surchargeMode.night-end', value: '06:00' },
    ]);
  });

  it('formats overtime tier rates as percent when the rate mode is Multiplier', () => {
    const rule: IIndustryTemplateSchedulingRuleEntry = {
      ...baseRule,
      overtimeRateMode: 'Multiplier',
      overtimeTier1AfterHours: 45,
      overtimeTier1Rate: 0.25,
    };

    const groups = buildSchedulingRuleDetailGroups(rule, {
      overtimeBasisLabel: null,
      overtimeRateModeLabel: 'Multiplier',
    });

    expect(groups[0].rows).toEqual([
      { labelKey: 'setting.overtime.rateMode.label', value: 'Multiplier' },
      { labelKey: 'setting.overtime.tier1.afterHours', value: '45' },
      { labelKey: 'setting.overtime.tier1.rate', value: '+25 %' },
    ]);
  });

  it('formats overtime tier rates as a plain amount when the rate mode is not Multiplier', () => {
    const rule: IIndustryTemplateSchedulingRuleEntry = {
      ...baseRule,
      overtimeRateMode: 'FixedPerHour',
      overtimeTier1Rate: 12.5,
    };

    const groups = buildSchedulingRuleDetailGroups(rule, {
      overtimeBasisLabel: null,
      overtimeRateModeLabel: 'Fixed per hour',
    });

    expect(groups[0].rows).toEqual([
      { labelKey: 'setting.overtime.rateMode.label', value: 'Fixed per hour' },
      { labelKey: 'setting.overtime.tier1.rate', value: '12.5' },
    ]);
  });

  it('includes the pre-translated overtime basis label only when provided', () => {
    const rule: IIndustryTemplateSchedulingRuleEntry = { ...baseRule, overtimeBasis: 'Week' };

    const groups = buildSchedulingRuleDetailGroups(rule, { overtimeBasisLabel: 'Weekly', overtimeRateModeLabel: null });

    expect(groups).toEqual([
      {
        headingKey: 'setting.activeIndustries.preview.rule.group.overtime',
        rows: [{ labelKey: 'setting.overtime.basis.label', value: 'Weekly' }],
      },
    ]);
  });

  it('groups vacation days and max work days under contract limits', () => {
    const rule: IIndustryTemplateSchedulingRuleEntry = { ...baseRule, vacationDaysPerYear: 25, maxWorkDays: 5 };

    const groups = buildSchedulingRuleDetailGroups(rule, noOvertimeLabels);

    expect(groups).toEqual([
      {
        headingKey: 'setting.activeIndustries.preview.rule.group.contractLimits',
        rows: [
          { labelKey: 'setting.schedulingRule.vacationDaysPerYear', value: '25' },
          { labelKey: 'setting.schedulingRule.maxWorkDays', value: '5' },
        ],
      },
    ]);
  });
});
