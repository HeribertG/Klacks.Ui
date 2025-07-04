import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import {
  BaseFilter,
  BaseTruncated,
  IBaseFilter,
  IBaseTruncated,
} from './general-class';

export enum ShiftStatus {
  Original = 0,
  Cut = 1,
}

export enum ShiftType {
  IsTask = 0,
  IsContainer = 1,
}

export enum MacroShiftType {
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

export type PropertyMetadata = Record<string, NumberPropertyMetadata>;

export class ShiftData {
  hour = 8; // Arbeitszeit
  hourExact = 8; // Arbeitszeit
  hourWithoutAddition = 8; // Arbeitszeit ohne Zusatz
  hourWithAddition = 0; // Arbeitszeit mit Zusatz
  hourAddition = 0.0; // Zusatz
  shiftType: MacroShiftType = MacroShiftType.NightShift;
  weekdayNumber: Weekday = Weekday.Monday;
  nightHour = 7;
  holydayHour = 1;
  dayBeforeHolydayHour = 7;
  lastType = 0;
  isHolyday = false;
  isNextDayHolyday = true;
  blockShiftIndex = 2;
  guaranteedHours = 160.0;
  hourAfterNight = 1;
  hourBeforeNight = 0;
  nightHourBeforeMidnight = 1;

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

export interface IShift {
  id?: string;
  cuttingAfterMidnight: boolean;
  description: string;
  macroId: string;
  name: string;
  parentId?: string;
  rootId?: string;
  status: ShiftStatus;
  numberEmployees: number;

  // Date and Time
  afterShift: string; // TimeOnly -> string im Format "HH:mm"
  beforeShift: string;
  endShift: string;
  fromDate: string; // DateOnly -> string im Format "YYYY-MM-DD"
  startShift: string;
  untilDate?: string;

  // WeekDay
  isFriday: boolean;
  isHoliday: boolean;
  isMonday: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  isThursday: boolean;
  isTuesday: boolean;
  isWednesday: boolean;
  isWeekdayOrHoliday: boolean;

  // Time
  isSporadic: boolean;
  isTimeRange: boolean;
  quantity: number;
  travelTimeAfter: number;
  travelTimeBefore: number;
  workTime: number;

  // Type
  shiftType: ShiftType;
}

export class Shift implements IShift {
  id?: string;
  cuttingAfterMidnight = false;
  description = '';
  macroId = '';
  name = '';
  parentId?: string;
  rootId?: string;
  status = ShiftStatus.Original;

  afterShift = '00:00';
  beforeShift = '00:00';
  endShift = '00:00';
  fromDate = '';
  startShift = '00:00';
  untilDate?: string;

  isFriday = false;
  isHoliday = false;
  isMonday = false;
  isSaturday = false;
  isSunday = false;
  isThursday = false;
  isTuesday = false;
  isWednesday = false;
  isWeekdayOrHoliday = false;

  isSporadic = false;
  isTimeRange = false;
  quantity = 1;
  numberEmployees = 1;
  travelTimeAfter = 0;
  travelTimeBefore = 0;
  workTime = 0;

  shiftType = ShiftType.IsTask;

  constructor(init?: Partial<IShift>) {
    Object.assign(this, init);
  }
}

export interface ITruncatedShift extends IBaseTruncated {
  shifts: IShift[];
}

export class TruncatedShift extends BaseTruncated implements ITruncatedShift {
  shifts: IShift[] = [];
}

export interface IShiftFilter extends IBaseFilter {
  scopeFromFlag?: boolean;
  scopeUntilFlag?: boolean;
  scopeFrom?: Date;
  internalScopeFrom?: NgbDateStruct;
  scopeUntil?: Date;
  internalScopeUntil?: NgbDateStruct;
  showDeleteEntries?: boolean;
  activeDateRange: boolean;
  formerDateRange: boolean;
  futureDateRange: boolean;
  selectedGroup: string | undefined;
}

export class ShiftFilter extends BaseFilter implements IShiftFilter {
  scopeFromFlag?: boolean;
  scopeUntilFlag?: boolean;
  scopeFrom?: Date;
  internalScopeFrom?: NgbDateStruct;
  scopeUntil?: Date;
  internalScopeUntil?: NgbDateStruct;
  showDeleteEntries = false;
  activeDateRange = false;
  formerDateRange = false;
  futureDateRange = false;

  override orderBy = 'name';
  override sortOrder = 'asc';

  selectedGroup: string | undefined = undefined;

  setEmpty(): void {
    this.activeDateRange = true;
    this.formerDateRange = false;
    this.futureDateRange = false;
  }
}
