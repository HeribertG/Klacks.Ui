import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { IClient, Membership } from './client-class';
import { GenderEnum } from 'src/app/helpers/enums/client-enum';
import { IShift } from './shift-class';
import { IBaseFilter } from './general-class';

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

export interface IWorkFilter extends IBaseFilter {
  dayVisibleBeforeMonth: number;
  dayVisibleAfterMonth: number;
  currentMonth: number;
  currentYear: number;
  works: Work[];
  selectedGroup: string | undefined;
}

export class WorkFilter implements IWorkFilter {
  dayVisibleBeforeMonth = 10;
  dayVisibleAfterMonth = 10;
  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();
  searchString = '';
  orderBy = '';
  sortOrder = '';
  numberOfItemsPerPage = 5;
  requiredPage = 0;
  numberOfItemOnPreviousPage: number | undefined = undefined;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;
  works: Work[] = [];
  selectedGroup: string | undefined = undefined;
}

export interface IOwnTime {
  hours: string | undefined;
  minutes: string | undefined;
  isDuration: boolean;
}

export class OwnTime implements IOwnTime {
  private pHours = '00';
  private pMinutes = '00';
  private pIsDuration = false;

  constructor(hours: string, minutes: string, isDuration = false) {
    this.pIsDuration = isDuration;
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

  get isDuration(): boolean {
    return this.pIsDuration;
  }

  set isDuration(value: boolean) {
    this.pIsDuration = value;
    if (!value && parseInt(this.pHours) > 23) {
      this.pHours = '23';
    }
  }

  public toString(): string {
    return this.pHours + ':' + this.pMinutes + ':00';
  }

  private formatHours(value: string): string {
    value = value.replace(/\D/g, '');

    if (value.length === 0) {
      return '00';
    }

    const numValue = parseInt(value) || 0;

    const maxHours = this.pIsDuration ? 999 : 23;
    const clampedValue = Math.min(numValue, maxHours);

    if (!this.pIsDuration) {
      return clampedValue.toString().padStart(2, '0');
    } else {
      if (clampedValue < 10) {
        return clampedValue.toString().padStart(2, '0');
      } else if (clampedValue < 100) {
        return clampedValue.toString();
      } else {
        return clampedValue.toString();
      }
    }
  }

  private formatMinutes(value: string): string {
    value = value.replace(/\D/g, '');

    if (value.length === 0) {
      value = '00';
    } else if (value.length === 1) {
      value = '0' + value;
    } else if (value.length >= 2) {
      if (+value > 59) {
        value = '59';
      }
      if (value.length === 3) {
        value = value.substring(1);
      }
    }

    return value;
  }

  public toMinutes(): number {
    const hours = parseInt(this.pHours) || 0;
    const minutes = parseInt(this.pMinutes) || 0;
    return hours * 60 + minutes;
  }

  public fromMinutes(totalMinutes: number): void {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    this.hours = hours.toString();
    this.minutes = minutes.toString();
  }

  static forTime(hours = '00', minutes = '00'): OwnTime {
    return new OwnTime(hours, minutes, false);
  }

  static forDuration(hours = '00', minutes = '00'): OwnTime {
    return new OwnTime(hours, minutes, true);
  }
}
