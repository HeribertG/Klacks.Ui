import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { OwnTime } from './schedule-class';
import { Group } from './group-class';
import { IClient } from './client-class';

export enum ShiftStatus {
  Original = 0,
  ReadyToCut = 1,
  IsCutOriginal = 2,
  IsCut = 3,
}

export enum ShiftType {
  IsTask = 0,
  IsContainer = 1,
}

export enum ShiftSporadic {
  Week = 0,
  Month = 1,
  Quarter = 2,
  Semester = 3,
  Year = 4,
  ContractualTerm = 5,
}

export interface IShift {
  cuttingAfterMidnight: boolean;
  abbreviation: string;
  description: string;
  id: string | undefined;
  macroId: string | undefined;
  name: string;
  parentId?: string;
  rootId?: string;
  lft: number | undefined;
  rgt: number | undefined;
  originalId?: string;
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
  sporadicScope: ShiftSporadic;
  isTimeRange: boolean;
  quantity: number;
  sumEmployees: number;
  travelTimeAfter: string;
  internalTravelTimeAfter: OwnTime;
  travelTimeBefore: string;
  internalTravelTimeBefore: OwnTime;
  workTime: number;
  internalWorkTime: OwnTime;
  briefingTime: string;
  internalBriefingTime: OwnTime;
  debriefingTime: string;
  internalDebriefingTime: OwnTime;
  shiftType: ShiftType;
  groups: Group[];
  clientId: string | undefined;
  client?: IClient | undefined;
  addressName: string | undefined;
  isNew?: boolean; // Flag um neue (CREATE) von aktualisierten (UPDATE) Shifts zu unterscheiden
}

export class Shift implements IShift {
  cuttingAfterMidnight = false;
  abbreviation = '';
  description = '';
  id: string | undefined = undefined;
  macroId: string | undefined = undefined;
  name = '';
  parentId?: string;
  rootId?: string;
  lft: number | undefined = undefined;
  rgt: number | undefined = undefined;
  originalId?: string;
  status: ShiftStatus = ShiftStatus.Original;
  afterShift = '';
  internalAfterShift = OwnTime.forTime('0', '0');
  beforeShift = '';
  internalBeforeShift = OwnTime.forTime('0', '0');
  endShift = '';
  internalEndShift = OwnTime.forTime('0', '0');
  briefingTime = '';
  internalBriefingTime = OwnTime.forTime('0', '0');
  fromDate: Date | undefined = undefined;
  internalFromDate: NgbDateStruct | undefined = undefined;
  startShift = '';
  internalStartShift = OwnTime.forTime('0', '0');
  debriefingTime = '';
  internalDebriefingTime = OwnTime.forTime('0', '0');
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
  sporadicScope: ShiftSporadic = ShiftSporadic.Week;
  isTimeRange = false;
  quantity = 1;
  sumEmployees = 1;
  travelTimeAfter = '';
  internalTravelTimeAfter = OwnTime.forTime('0', '0');
  travelTimeBefore = '';
  internalTravelTimeBefore = OwnTime.forTime('0', '0');
  workTime = 0;
  internalWorkTime = OwnTime.forDuration('0', '0');
  shiftType: ShiftType = ShiftType.IsTask;
  groups: Group[] = [];
  clientId: string | undefined = undefined;
  client?: IClient | undefined = undefined;
  addressName: string | undefined = undefined;
  isNew?: boolean = false; // Default: false, wird auf true gesetzt bei neuen Cut-Shifts
}
