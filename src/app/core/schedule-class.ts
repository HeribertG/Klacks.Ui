import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { IClient, Membership } from './client-class';
import { GenderEnum } from '../helpers/enums/client-enum';
import { IShift } from './shift-class';

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
  clientId = '';
  from: Date = new Date();
  internalFrom: NgbDateStruct | undefined = undefined;
  id?: string;
  information?: string;
  isSealed = false;
  shift?: IShift;
  shiftId = '';
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
  selectedGroup: string | undefined;
}

export class WorkFilter implements IWorkFilter {
  dayVisibleBeforeMonth = 10;
  dayVisibleAfterMonth = 10;
  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();
  orderBy = '';
  search = '';
  sortOrder = '';
  works: Work[] = [];
  selectedGroup: string | undefined = undefined;
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
