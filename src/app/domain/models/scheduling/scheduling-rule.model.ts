// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ISchedulingRule {
  id: string;
  name: string;
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
}
