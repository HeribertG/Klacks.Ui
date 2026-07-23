// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * One scheduling rule entry within an industry template preview. Mirrors
 * Klacks.Api Application/DTOs/IndustryTemplates/IndustryTemplateSchedulingRuleItem.cs. All
 * detail fields beyond name/description are optional and nullable: the backend preview
 * response is rolled out incrementally, so any of them may be absent until deployed, and
 * consumers must render only the fields that actually arrive. overtimeBasis is the raw C#
 * enum ToString() value ("Day" | "Week"); overtimeRateMode is likewise raw enum text
 * ("Multiplier" | "FixedPerHour" | "FixedPerShift").
 * @param name - Plain-text scheduling rule name
 * @param description - Always null: the SchedulingRule domain model has no description field
 * @param defaultWorkingHours - Standard daily working hours
 * @param fullTimeHours - Full-time weekly hours
 * @param maxDailyHours - Maximum daily working hours
 * @param maxWeeklyHours - Maximum weekly working hours
 * @param maxConsecutiveDays - Maximum consecutive work days
 * @param minRestDays - Minimum rest days between two work blocks
 * @param minPauseHours - Minimum free hours between two work days
 * @param overtimeThreshold - Weekly hours threshold before overtime applies
 * @param overtimeBasis - Overtime calculation basis, raw enum text ("Day" | "Week")
 * @param overtimeRateMode - How overtime tier rates are computed, raw enum text
 * ("Multiplier" | "FixedPerHour" | "FixedPerShift")
 * @param overtimeTier1AfterHours - Hours worked before overtime tier 1 applies
 * @param overtimeTier1Rate - Tier 1 overtime rate (percent if overtimeRateMode is
 * Multiplier, otherwise a fixed amount)
 * @param overtimeTier2AfterHours - Hours worked before overtime tier 2 applies
 * @param overtimeTier2Rate - Tier 2 overtime rate
 * @param overtimeTier3AfterHours - Hours worked before overtime tier 3 applies
 * @param overtimeTier3Rate - Tier 3 overtime rate
 * @param nightStart - Night surcharge window start
 * @param nightEnd - Night surcharge window end
 * @param nightRate - Night surcharge rate as a decimal fraction (0.25 = +25%)
 * @param holidayRate - Holiday surcharge rate as a decimal fraction (0.25 = +25%)
 * @param weekend1Rate - Weekend surcharge tier 1 rate as a decimal fraction
 * @param weekend2Rate - Weekend surcharge tier 2 rate as a decimal fraction
 * @param weekend3Rate - Weekend surcharge tier 3 rate as a decimal fraction
 * @param vacationDaysPerYear - Vacation days granted per year
 * @param maxWorkDays - Maximum work days permitted by the contract
 * @param maxOptimalGap - Maximum optimal gap between shifts, in hours
 * @param guaranteedHours - Guaranteed hours
 * @param maximumHours - Maximum contractual hours
 * @param minimumHours - Minimum contractual hours
 */
export interface IIndustryTemplateSchedulingRuleEntry {
  name: string;
  description: string | null;
  defaultWorkingHours?: number | null;
  fullTimeHours?: number | null;
  maxDailyHours?: number | null;
  maxWeeklyHours?: number | null;
  maxConsecutiveDays?: number | null;
  minRestDays?: number | null;
  minPauseHours?: number | null;
  overtimeThreshold?: number | null;
  overtimeBasis?: string | null;
  overtimeRateMode?: string | null;
  overtimeTier1AfterHours?: number | null;
  overtimeTier1Rate?: number | null;
  overtimeTier2AfterHours?: number | null;
  overtimeTier2Rate?: number | null;
  overtimeTier3AfterHours?: number | null;
  overtimeTier3Rate?: number | null;
  nightStart?: string | null;
  nightEnd?: string | null;
  nightRate?: number | null;
  holidayRate?: number | null;
  weekend1Rate?: number | null;
  weekend2Rate?: number | null;
  weekend3Rate?: number | null;
  vacationDaysPerYear?: number | null;
  maxWorkDays?: number | null;
  maxOptimalGap?: number | null;
  guaranteedHours?: number | null;
  maximumHours?: number | null;
  minimumHours?: number | null;
}
