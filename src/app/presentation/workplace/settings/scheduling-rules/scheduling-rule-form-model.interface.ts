// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface SchedulingRuleFormModel {
  name: string;
  maxWorkDays: number | null;
  minRestDays: number | null;
  minPauseHours: number | null;
  maxDailySpanHours: number | null;
  maxOptimalGap: number | null;
  maxDailyHours: number | null;
  maxWeeklyHours: number | null;
  maxConsecutiveDays: number | null;
  defaultWorkingHours: number | null;
  overtimeThreshold: number | null;
  guaranteedHours: number | null;
  maximumHours: number | null;
  minimumHours: number | null;
  fullTimeHours: number | null;
  vacationDaysPerYear: number | null;
  nightRate: number | null;
  holidayRate: number | null;
  we1Rate: number | null;
  we2Rate: number | null;
  we3Rate: number | null;
  nightStart: string | null;
  nightEnd: string | null;
  workOnMonday: boolean | null;
  workOnTuesday: boolean | null;
  workOnWednesday: boolean | null;
  workOnThursday: boolean | null;
  workOnFriday: boolean | null;
  workOnSaturday: boolean | null;
  workOnSunday: boolean | null;
  performsShiftWork: boolean | null;
}
