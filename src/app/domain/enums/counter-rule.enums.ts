// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export enum CounterEventType {
  NightShift = 1,
  WorkedDayInWeek = 2,
  ShiftExceedingHours = 3,
}

export enum CounterPeriod {
  Week = 1,
  Month = 2,
  Year = 3,
}

export enum RuleEnforcementMode {
  Warn = 0,
  Block = 1,
}
