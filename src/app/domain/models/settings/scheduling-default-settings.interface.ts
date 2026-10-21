// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISchedulingDefaultSettings {
  defaultWorkingHours: number;
  overtimeThreshold: number;
  guaranteedHours: number;
  maximumHours: number;
  minimumHours: number;
  fullTime: number;
  schedulingMaxWorkDays: number;
  schedulingMinRestDays: number;
  schedulingMinPauseHours: number;
  schedulingMaxDailySpanHours: number;
  schedulingMaxOptimalGap: number;
  schedulingMaxDailyHours: number;
  schedulingMaxWeeklyHours: number;
  schedulingMaxConsecutiveDays: number;
  workOnMonday: boolean;
  workOnTuesday: boolean;
  workOnWednesday: boolean;
  workOnThursday: boolean;
  workOnFriday: boolean;
  workOnSaturday: boolean;
  workOnSunday: boolean;
  performsShiftWork: boolean;
  weekendDays: string[];
  weekStartDay: string;
  commandKeywordFree: string;
  commandKeywordEarly: string;
  commandKeywordLate: string;
  commandKeywordNight: string;
  commandKeywordNegFree: string;
  commandKeywordNegEarly: string;
  commandKeywordNegLate: string;
  commandKeywordNegNight: string;
}
