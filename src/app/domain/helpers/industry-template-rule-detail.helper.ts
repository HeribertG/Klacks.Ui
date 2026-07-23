// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Builds the grouped label-value rows shown in a scheduling rule's expanded detail panel.
 * Only fields that actually arrived (non-null/non-undefined) produce a row, and only groups
 * with at least one row are returned. Reuses the existing i18n labels from the
 * scheduling-rule, overtime and surcharge-mode settings cards for the same underlying
 * concepts instead of duplicating them. Overtime tier rates are formatted as a percentage
 * only when overtimeRateMode is 'Multiplier'; otherwise they are shown as a plain amount,
 * since a fixed-per-hour/fixed-per-shift rate is not a percentage.
 */
import { IIndustryTemplateSchedulingRuleEntry } from 'src/app/domain/models/settings/industry-template-scheduling-rule-entry.interface';
import { IIndustryTemplateRuleDetailRow } from 'src/app/domain/models/settings/industry-template-rule-detail-row.interface';
import { IIndustryTemplateRuleDetailGroup } from 'src/app/domain/models/settings/industry-template-rule-detail-group.interface';
import { IIndustryTemplateOvertimeLabels } from 'src/app/domain/models/settings/industry-template-overtime-labels.interface';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';

const RATE_PERCENT_MULTIPLIER = 100;
const OVERTIME_RATE_MODE_MULTIPLIER = 'Multiplier';

function formatRatePercent(rate: number): string {
  const percent = Math.round(rate * RATE_PERCENT_MULTIPLIER);
  return percent >= 0 ? `+${percent} %` : `${percent} %`;
}

function pushIfPresent(
  rows: IIndustryTemplateRuleDetailRow[],
  value: number | string | null | undefined,
  labelKey: string,
  formatValue: (value: number | string) => string = String,
): void {
  if (value !== null && value !== undefined) {
    rows.push({ labelKey, value: formatValue(value) });
  }
}

function buildWorkingTimeRows(rule: IIndustryTemplateSchedulingRuleEntry): IIndustryTemplateRuleDetailRow[] {
  const rows: IIndustryTemplateRuleDetailRow[] = [];
  pushIfPresent(rows, rule.defaultWorkingHours, 'setting.schedulingRule.defaultWorkingHours');
  pushIfPresent(rows, rule.fullTimeHours, 'setting.schedulingRule.fullTimeHours');
  pushIfPresent(rows, rule.maxDailyHours, 'setting.schedulingRule.maxDailyHours');
  pushIfPresent(rows, rule.maxWeeklyHours, 'setting.schedulingRule.maxWeeklyHours');
  pushIfPresent(rows, rule.guaranteedHours, 'setting.schedulingRule.guaranteedHours');
  pushIfPresent(rows, rule.maximumHours, 'setting.schedulingRule.maximumHours');
  pushIfPresent(rows, rule.minimumHours, 'setting.schedulingRule.minimumHours');
  pushIfPresent(rows, rule.maxOptimalGap, 'setting.schedulingRule.maxOptimalGap');
  return rows;
}

function buildRestTimeRows(rule: IIndustryTemplateSchedulingRuleEntry): IIndustryTemplateRuleDetailRow[] {
  const rows: IIndustryTemplateRuleDetailRow[] = [];
  pushIfPresent(rows, rule.minRestDays, 'setting.schedulingRule.minRestDays');
  pushIfPresent(rows, rule.minPauseHours, 'setting.schedulingRule.minPauseHours');
  pushIfPresent(rows, rule.maxConsecutiveDays, 'setting.schedulingRule.maxConsecutiveDays');
  return rows;
}

function buildSurchargeRows(rule: IIndustryTemplateSchedulingRuleEntry): IIndustryTemplateRuleDetailRow[] {
  const rows: IIndustryTemplateRuleDetailRow[] = [];
  pushIfPresent(rows, rule.nightStart, 'setting.surchargeMode.night-start', (value) => formatTime(String(value)));
  pushIfPresent(rows, rule.nightEnd, 'setting.surchargeMode.night-end', (value) => formatTime(String(value)));
  pushIfPresent(rows, rule.nightRate, 'setting.schedulingRule.nightRate', (value) => formatRatePercent(Number(value)));
  pushIfPresent(rows, rule.holidayRate, 'setting.schedulingRule.holidayRate', (value) => formatRatePercent(Number(value)));
  pushIfPresent(rows, rule.weekend1Rate, 'setting.activeIndustries.preview.rule.weekend1Rate', (value) => formatRatePercent(Number(value)));
  pushIfPresent(rows, rule.weekend2Rate, 'setting.activeIndustries.preview.rule.weekend2Rate', (value) => formatRatePercent(Number(value)));
  pushIfPresent(rows, rule.weekend3Rate, 'setting.activeIndustries.preview.rule.weekend3Rate', (value) => formatRatePercent(Number(value)));
  return rows;
}

function buildOvertimeRows(
  rule: IIndustryTemplateSchedulingRuleEntry,
  overtimeLabels: IIndustryTemplateOvertimeLabels,
): IIndustryTemplateRuleDetailRow[] {
  const rows: IIndustryTemplateRuleDetailRow[] = [];
  const tierRateIsPercent = rule.overtimeRateMode === OVERTIME_RATE_MODE_MULTIPLIER;
  const formatTierRate = (value: number | string): string =>
    tierRateIsPercent ? formatRatePercent(Number(value)) : String(value);

  pushIfPresent(rows, rule.overtimeThreshold, 'setting.schedulingRule.overtimeThreshold');
  if (overtimeLabels.overtimeBasisLabel) {
    rows.push({ labelKey: 'setting.overtime.basis.label', value: overtimeLabels.overtimeBasisLabel });
  }
  if (overtimeLabels.overtimeRateModeLabel) {
    rows.push({ labelKey: 'setting.overtime.rateMode.label', value: overtimeLabels.overtimeRateModeLabel });
  }
  pushIfPresent(rows, rule.overtimeTier1AfterHours, 'setting.overtime.tier1.afterHours');
  pushIfPresent(rows, rule.overtimeTier1Rate, 'setting.overtime.tier1.rate', formatTierRate);
  pushIfPresent(rows, rule.overtimeTier2AfterHours, 'setting.overtime.tier2.afterHours');
  pushIfPresent(rows, rule.overtimeTier2Rate, 'setting.overtime.tier2.rate', formatTierRate);
  pushIfPresent(rows, rule.overtimeTier3AfterHours, 'setting.overtime.tier3.afterHours');
  pushIfPresent(rows, rule.overtimeTier3Rate, 'setting.overtime.tier3.rate', formatTierRate);
  return rows;
}

function buildContractLimitRows(rule: IIndustryTemplateSchedulingRuleEntry): IIndustryTemplateRuleDetailRow[] {
  const rows: IIndustryTemplateRuleDetailRow[] = [];
  pushIfPresent(rows, rule.vacationDaysPerYear, 'setting.schedulingRule.vacationDaysPerYear');
  pushIfPresent(rows, rule.maxWorkDays, 'setting.schedulingRule.maxWorkDays');
  return rows;
}

export function buildSchedulingRuleDetailGroups(
  rule: IIndustryTemplateSchedulingRuleEntry,
  overtimeLabels: IIndustryTemplateOvertimeLabels,
): IIndustryTemplateRuleDetailGroup[] {
  const groups: IIndustryTemplateRuleDetailGroup[] = [
    { headingKey: 'setting.activeIndustries.preview.rule.group.workingTime', rows: buildWorkingTimeRows(rule) },
    { headingKey: 'setting.activeIndustries.preview.rule.group.restTimes', rows: buildRestTimeRows(rule) },
    { headingKey: 'setting.activeIndustries.preview.rule.group.surcharges', rows: buildSurchargeRows(rule) },
    { headingKey: 'setting.activeIndustries.preview.rule.group.overtime', rows: buildOvertimeRows(rule, overtimeLabels) },
    { headingKey: 'setting.activeIndustries.preview.rule.group.contractLimits', rows: buildContractLimitRows(rule) },
  ];

  return groups.filter((group) => group.rows.length > 0);
}
