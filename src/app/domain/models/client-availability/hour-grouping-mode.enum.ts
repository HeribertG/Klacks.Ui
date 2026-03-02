// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export enum HourGroupingMode {
  OneHour = 0,
  TwoHour = 1,
  FourHour = 2,
  AmPm = 3,
  FullDay = 4,
}

export const HOUR_GROUPING_SIZES: Record<HourGroupingMode, number> = {
  [HourGroupingMode.OneHour]: 1,
  [HourGroupingMode.TwoHour]: 2,
  [HourGroupingMode.FourHour]: 4,
  [HourGroupingMode.AmPm]: 12,
  [HourGroupingMode.FullDay]: 24,
};

export const COLUMNS_PER_DAY: Record<HourGroupingMode, number> = {
  [HourGroupingMode.OneHour]: 24,
  [HourGroupingMode.TwoHour]: 12,
  [HourGroupingMode.FourHour]: 6,
  [HourGroupingMode.AmPm]: 2,
  [HourGroupingMode.FullDay]: 1,
};
