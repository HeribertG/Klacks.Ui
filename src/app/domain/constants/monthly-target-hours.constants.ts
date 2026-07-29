// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export const MONTHLY_TARGET_HOURS = {
  minMonth: 1,
  maxMonth: 12,
  minYear: 1900,
  maxYear: 2999,
  fullWorkloadPercent: 100,
} as const;

export const MONTH_TRANSLATION_KEYS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;
