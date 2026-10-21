// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { NumberPropertyMetadata } from './number-property-metadata.interface';

export enum MacroShiftType {
  DayShift = 0,
  NightShift = 1,
  MixedShift = 2,
}

export enum Weekday {
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
  Sunday = 7,
}

export enum HolidayStatus {
  DayAfter = -2,
  DayBefore = -1,
  NoHoliday = 0,
  Holiday = 1,
}

export type PropertyMetadata = Record<string, NumberPropertyMetadata>;

export class ShiftData {
  Hour = 8;
  FromHour = '08:00';
  UntilHour = '16:00';
  Weekday = 1;
  WeekendDay1 = 6;
  WeekendDay2 = 7;
  WeekendDay3 = 0;
  Holiday = 0;
  HolidayNextDay = 0;
  NightRate = 0.1;
  HolidayRate = 0.15;
  We1Rate = 0.1;
  We2Rate = 0.1;
  We3Rate = 0;
  NightStart = '23:00';
  NightEnd = '06:00';
  GuaranteedHours = 160.0;
  FullTime = 180.0;
  Percent = 100;

  static metadata: PropertyMetadata = {
    Hour: { min: 0, max: 24, decimals: 2, step: 0.05 },
    WeekendDay1: { min: 0, max: 7, decimals: 0 },
    WeekendDay2: { min: 0, max: 7, decimals: 0 },
    WeekendDay3: { min: 0, max: 7, decimals: 0 },
    Holiday: { min: -2, max: 1, decimals: 0 },
    HolidayNextDay: { min: -2, max: 1, decimals: 0 },
    NightRate: { min: 0, max: 1, decimals: 2, step: 0.01 },
    HolidayRate: { min: 0, max: 1, decimals: 2, step: 0.01 },
    We1Rate: { min: 0, max: 1, decimals: 2, step: 0.01 },
    We2Rate: { min: 0, max: 1, decimals: 2, step: 0.01 },
    We3Rate: { min: 0, max: 1, decimals: 2, step: 0.01 },
    GuaranteedHours: { min: 0, max: 220, decimals: 1 },
    FullTime: { min: 0, max: 220, decimals: 1 },
    Percent: { min: 0, max: 200, decimals: 2, step: 1 },
  };
}
