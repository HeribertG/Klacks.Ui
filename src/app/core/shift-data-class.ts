export enum ShiftType {
  DayShift = 0,
  NightShift = 1,
  MixedShift = 2,
}

export enum Weekday {
  Monday = 0,
  Tuesday = 1,
  Wednesday = 2,
  Thursday = 3,
  Friday = 4,
  Saturday = 5,
  Sunday = 6,
}

export interface NumberPropertyMetadata {
  min?: number;
  max?: number;
  decimals?: number;
  step?: number;
}

export interface PropertyMetadata {
  [key: string]: NumberPropertyMetadata;
}

export class ShiftData {
  hour: number = 8; // Arbeitszeit
  hourExact: number = 8; // Arbeitszeit
  hourWithoutAddition: number = 8; // Arbeitszeit ohne Zusatz
  hourWithAddition: number = 0; // Arbeitszeit mit Zusatz
  hourAddition: number = 0.0; // Zusatz
  blockShiftNumber: number = 1;
  shiftType: ShiftType = ShiftType.NightShift;
  weekdayNumber: Weekday = Weekday.Monday;
  nightHour: number = 7;
  holydayHour: number = 1;
  dayBeforeHolydayHour: number = 7;
  blockNumber: number = 2;
  lastType: number = 0;
  isHolyday: boolean = false;
  isNextDayHolyday: boolean = true;
  blockShiftIndex: number = 2;
  guaranteedHours: number = 160.0;
  hourAfterNight: number = 1;
  hourBeforeNight: number = 0;
  nightHourBeforeMidnight: number = 1;

  static metadata: PropertyMetadata = {
    hour: { min: 0, max: 24, decimals: 2, step: 0.05 },
    hourExact: { min: 0, max: 24, decimals: 2, step: 0.05 },
    hourWithoutAddition: { min: 0, max: 24, decimals: 1 },
    hourWithAddition: { min: 0, max: 24, decimals: 1 },
    hourAddition: { min: 0, max: 12, decimals: 2, step: 0.25 },
    blockShiftNumber: { min: 1, max: 10, decimals: 0 },
    nightHour: { min: 0, max: 12, decimals: 1 },
    dayBeforeHolydayHour: { min: 0, max: 24, decimals: 1 },
    blockNumber: { min: 1, max: 10, decimals: 0 },
    guaranteedHours: { min: 0, max: 220, decimals: 1 },
    hourAfterNight: { min: 0, max: 8, decimals: 1 },
    hourBeforeNight: { min: 0, max: 8, decimals: 1 },
    nightHourBeforeMidnight: { min: 0, max: 12, decimals: 1 },
  };
}
