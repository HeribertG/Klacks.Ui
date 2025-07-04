import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { OwnTime } from './schedule-class';

export enum ShiftStatus {
  Original = 0,
  Cut = 1,
}

export enum ShiftType {
  IsTask = 0,
  IsContainer = 1,
}

export interface IShift {
  cuttingAfterMidnight: boolean;
  abbreviation: string;
  description: string;
  id: string | undefined;
  macroId: string;
  name: string;
  parentId?: string;
  rootId?: string;
  status: ShiftStatus;
  afterShift: string;
  internalAfterShift: OwnTime;
  beforeShift: string;
  internalBeforeShift: OwnTime;
  endShift: string;
  internalEndShift: OwnTime;
  fromDate: Date | undefined;
  internalFromDate: NgbDateStruct | undefined;
  startShift: string;
  internalStartShift: OwnTime;
  untilDate: Date | undefined;
  internalUntilDate: NgbDateStruct | undefined;
  isFriday: boolean;
  isHoliday: boolean;
  isMonday: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  isThursday: boolean;
  isTuesday: boolean;
  isWednesday: boolean;
  isWeekdayOrHoliday: boolean;
  isSporadic: boolean;
  isTimeRange: boolean;
  quantity: number;
  sumEmployees: number;
  travelTimeAfter: string;
  internalTravelTimeAfter: OwnTime;
  travelTimeBefore: string;
  internalTravelTimeBefore: OwnTime;
  workTime: number;
  internalWorkTime: OwnTime;
  shiftType: ShiftType;
}

export class Shift implements IShift {
  cuttingAfterMidnight = false;
  abbreviation = '';
  description = '';
  id: string | undefined = undefined;
  macroId = '';
  name = '';
  parentId?: string;
  rootId?: string;
  status: ShiftStatus = ShiftStatus.Original;
  afterShift = '';
  internalAfterShift = new OwnTime('0', '0');
  beforeShift = '';
  internalBeforeShift = new OwnTime('0', '0');
  endShift = '';
  internalEndShift = new OwnTime('0', '0');
  fromDate: Date | undefined = undefined;
  internalFromDate: NgbDateStruct | undefined = undefined;
  startShift = '';
  internalStartShift = new OwnTime('0', '0');
  untilDate: Date | undefined = undefined;
  internalUntilDate: NgbDateStruct | undefined = undefined;
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
  sumEmployees = 1;
  travelTimeAfter = '';
  internalTravelTimeAfter = new OwnTime('0', '0');
  travelTimeBefore = '';
  internalTravelTimeBefore = new OwnTime('0', '0');
  workTime = 0;
  internalWorkTime = new OwnTime('0', '0');
  shiftType: ShiftType = ShiftType.IsTask;
}
