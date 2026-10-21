// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface SchedulingDefaultsFormModel {
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
  nightRate: number;
  holidayRate: number;
  saRate: number;
  soRate: number;
  workOnMonday: boolean;
  workOnTuesday: boolean;
  workOnWednesday: boolean;
  workOnThursday: boolean;
  workOnFriday: boolean;
  workOnSaturday: boolean;
  workOnSunday: boolean;
  performsShiftWork: boolean;
  weekendMonday: boolean;
  weekendTuesday: boolean;
  weekendWednesday: boolean;
  weekendThursday: boolean;
  weekendFriday: boolean;
  weekendSaturday: boolean;
  weekendSunday: boolean;
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
