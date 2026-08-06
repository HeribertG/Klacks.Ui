// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ISchedulingRule {
  id: string;
  name: string;
  industry: string;
  importSourceKey: string;
  maxWorkDays: number | null;
  minRestDays: number | null;
  minPauseHours: number | null;
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

export class SchedulingRule implements ISchedulingRule {
  id = '';
  name = '';
  maxWorkDays: number | null = null;
  minRestDays: number | null = null;
  minPauseHours: number | null = null;
  maxOptimalGap: number | null = null;
  maxDailyHours: number | null = null;
  maxWeeklyHours: number | null = null;
  maxConsecutiveDays: number | null = null;
  defaultWorkingHours: number | null = null;
  overtimeThreshold: number | null = null;
  guaranteedHours: number | null = null;
  maximumHours: number | null = null;
  minimumHours: number | null = null;
  fullTimeHours: number | null = null;
  vacationDaysPerYear: number | null = null;
  nightRate: number | null = null;
  holidayRate: number | null = null;
  we1Rate: number | null = null;
  we2Rate: number | null = null;
  we3Rate: number | null = null;
  nightStart: string | null = null;
  nightEnd: string | null = null;
  workOnMonday: boolean | null = null;
  workOnTuesday: boolean | null = null;
  workOnWednesday: boolean | null = null;
  workOnThursday: boolean | null = null;
  workOnFriday: boolean | null = null;
  workOnSaturday: boolean | null = null;
  workOnSunday: boolean | null = null;
  performsShiftWork: boolean | null = null;
  industry = '';
  importSourceKey = '';
}
