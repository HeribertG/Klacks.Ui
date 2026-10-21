// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISchedulingDefaultSettings } from './scheduling-default-settings.interface';
import { SCHEDULING_DEFAULT_MIN_REST_HOURS } from 'src/app/domain/constants/scheduling-policy-defaults.constants';

export class SchedulingDefaultSettings implements ISchedulingDefaultSettings {
  defaultWorkingHours = 8.5;
  overtimeThreshold = 42;
  guaranteedHours = 170;
  maximumHours = 200;
  minimumHours = 160;
  fullTime = 180;
  schedulingMaxWorkDays = 5;
  schedulingMinRestDays = 2;
  schedulingMinPauseHours = SCHEDULING_DEFAULT_MIN_REST_HOURS;
  schedulingMaxDailySpanHours = 0;
  schedulingMaxOptimalGap = 2;
  schedulingMaxDailyHours = 10;
  schedulingMaxWeeklyHours = 50;
  schedulingMaxConsecutiveDays = 6;
  workOnMonday = true;
  workOnTuesday = true;
  workOnWednesday = true;
  workOnThursday = true;
  workOnFriday = true;
  workOnSaturday = false;
  workOnSunday = false;
  performsShiftWork = false;
  weekendDays = ['Saturday', 'Sunday'];
  weekStartDay = 'Monday';
  commandKeywordFree = 'FREE';
  commandKeywordEarly = 'EARLY';
  commandKeywordLate = 'LATE';
  commandKeywordNight = 'NIGHT';
  commandKeywordNegFree = '-FREE';
  commandKeywordNegEarly = '-EARLY';
  commandKeywordNegLate = '-LATE';
  commandKeywordNegNight = '-NIGHT';
}
