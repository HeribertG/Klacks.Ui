// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISchedulingRule } from './scheduling-rule.interface';

export class SchedulingRule implements ISchedulingRule {
  id = '';
  name = '';
  maxWorkDays: number | null = null;
  minRestDays: number | null = null;
  minPauseHours: number | null = null;
  maxDailySpanHours: number | null = null;
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
