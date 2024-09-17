import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { IClient, Membership } from './client-class';
import { GenderEnum } from '../helpers/enums/client-enum';

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
  _quantity: number;
  quantity: number;
  travelTimeAfter: string;
  internalTravelTimeAfter: OwnTime;
  travelTimeBefore: string;
  internalTravelTimeBefore: OwnTime;
  workTime: number;
  internalWorkTime: OwnTime;
  shiftType: ShiftType;
}

export class Shift implements IShift {
  cuttingAfterMidnight: boolean = false;
  abbreviation: string = '';
  description: string = '';
  id: string | undefined = undefined;
  macroId: string = '';
  name: string = '';
  parentId?: string;
  rootId?: string;
  status: ShiftStatus = ShiftStatus.Original;
  afterShift: string = '';
  internalAfterShift = new OwnTime('0', '0');
  beforeShift: string = '';
  internalBeforeShift = new OwnTime('0', '0');
  endShift: string = '';
  internalEndShift = new OwnTime('0', '0');
  fromDate: Date | undefined = undefined;
  internalFromDate: NgbDateStruct | undefined = undefined;
  startShift: string = '';
  internalStartShift = new OwnTime('0', '0');
  untilDate: Date | undefined = undefined;
  internalUntilDate: NgbDateStruct | undefined = undefined;
  isFriday: boolean = false;
  isHoliday: boolean = false;
  isMonday: boolean = false;
  isSaturday: boolean = false;
  isSunday: boolean = false;
  isThursday: boolean = false;
  isTuesday: boolean = false;
  isWednesday: boolean = false;
  isWeekdayOrHoliday: boolean = false;
  isSporadic: boolean = false;
  isTimeRange: boolean = false;
  _quantity: number = 1;
  set quantity(value: number) {
    if (!value) {
      value = 1;
    }
    if (value < 1) {
      value = 1;
    }

    this._quantity = value;
  }
  get quantity(): number {
    return this._quantity;
  }
  travelTimeAfter: string = '';
  internalTravelTimeAfter = new OwnTime('0', '0');
  travelTimeBefore: string = '';
  internalTravelTimeBefore = new OwnTime('0', '0');
  workTime: number = 0;
  internalWorkTime = new OwnTime('0', '0');
  shiftType: ShiftType = ShiftType.IsTask;
}

export interface IWork {
  client?: IClient;
  clientId: string;
  from: Date;
  internalFrom: NgbDateStruct | undefined;
  id?: string;
  information?: string;
  isSealed: boolean;
  shift?: IShift;
  shiftId: string;
  until: Date;
  internalUntil: NgbDateStruct | undefined;
}

export class Work implements IWork {
  client?: IClient;
  clientId: string = '';
  from: Date = new Date();
  internalFrom: NgbDateStruct | undefined = undefined;
  id?: string;
  information?: string;
  isSealed: boolean = false;
  shift?: IShift;
  shiftId: string = '';
  until: Date = new Date();
  internalUntil: NgbDateStruct | undefined = undefined;
}

export interface IClientWork {
  company?: string;
  firstName?: string;
  gender: GenderEnum;
  id: string;
  idNumber: number;
  legalEntity: boolean;
  maidenName?: string;
  membership?: Membership;
  membershipId: string;
  name?: string;
  secondName?: string;
  title?: string;
  type: number;
  neededRows: number;
  works: Work[];
}

export class ClientWork implements IClientWork {
  company = '';
  firstName = '';
  gender!: GenderEnum;
  id!: string;
  idNumber!: number;
  legalEntity!: boolean;
  maidenName = '';
  membership?: Membership;
  membershipId!: string;
  name = '';
  secondName = '';

  title = '';
  type!: number;
  neededRows = 3;
  works: Work[] = [];
}

export interface IWorkFilter {
  dayVisibleBeforeMonth: number;
  dayVisibleAfterMonth: number;
  currentMonth: number;
  currentYear: number;
  orderBy: string;
  search: string;
  sortOrder: string;
  works: Work[];
}

export class WorkFilter implements IWorkFilter {
  dayVisibleBeforeMonth: number = 10;
  dayVisibleAfterMonth: number = 10;
  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();
  orderBy = '';
  search = '';
  sortOrder = '';
  works: Work[] = [];
}

export interface IOwnTime {
  hours: string | undefined;
  minutes: string | undefined;
}

export class OwnTime implements IOwnTime {
  private pHours = '00';
  private pMinutes = '00';
  constructor(hours: string, minutes: string) {
    this.hours = hours;
    this.minutes = minutes;
  }
  get hours(): string {
    return this.pHours;
  }

  set hours(hours: string) {
    this.pHours = this.formatHours(hours);
  }
  get minutes(): string {
    return this.pMinutes;
  }

  set minutes(minutes: string) {
    this.pMinutes = this.formatMinutes(minutes);
  }

  public toString(): string {
    return this.pHours + ':' + this.pMinutes + ':00';
  }

  private formatHours(value: string): string {
    value = value.replace(/\D/g, '');

    if (value.length === 0) {
      value = '00';
    } else if (value.length === 1) {
      value = '0' + value;
      value = value.replace(/^(\d{0,2})/, '$1');
    } else if (value.length >= 2) {
      if (+value > 23) {
        value = '23';
      }
      if (value.length === 3) {
        value = value.substring(1);
      }

      value = value.replace(/^(\d{0,2})/, '$1');
    }

    return value;
  }

  private formatMinutes(value: string): string {
    value = value.replace(/\D/g, '');

    if (value.length === 0) {
      value = '00';
    } else if (value.length === 1) {
      value = '0' + value;
      value = value.replace(/^(\d{0,2})/, '$1');
    } else if (value.length >= 2) {
      if (+value > 59) {
        value = '59';
      }
      if (value.length === 3) {
        value = value.substring(1);
      }

      value = value.replace(/^(\d{0,2})/, '$1');
    }

    return value;
  }
}
