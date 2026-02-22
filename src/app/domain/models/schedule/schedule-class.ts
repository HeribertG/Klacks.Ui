// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IClient, Membership } from '../client/client-class';
import { GenderEnum } from 'src/app/domain/enums/client-enum';
import { IShift } from '../shift/shift-class';
import { IBaseFilter } from '../general-class';
import { IPeriodHours, IScheduleCell } from './work-schedule-class';

export interface IWork {
  client?: IClient;
  clientId: string;
  currentDate: Date;
  id?: string;
  information?: string;
  lockLevel: number;
  sealedAt?: string;
  sealedBy?: string;
  shift?: IShift;
  shiftId: string;
  workTime: number;
  surcharges: number;
  startTime: string;
  endTime: string;
  periodHours?: IPeriodHours;
  periodStart?: string;
  periodEnd?: string;
  scheduleEntries?: IScheduleCell[];
}

export class Work implements IWork {
  client?: IClient;
  clientId = '';
  currentDate: Date = new Date();
  id?: string;
  information?: string;
  lockLevel = 0;
  sealedAt?: string;
  sealedBy?: string;
  shift?: IShift;
  shiftId = '';
  workTime = 0;
  surcharges = 0;
  startTime = '';
  endTime = '';
  periodHours?: IPeriodHours;
  periodStart?: string;
  periodEnd?: string;
  scheduleEntries?: IScheduleCell[];
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
  displayRows: number;
  works: Work[];
  hasContract: boolean;
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
  displayRows = 3;
  works: Work[] = [];
  hasContract = false;
}

export interface IWorkFilter extends IBaseFilter {
  currentMonth: number;
  currentYear: number;
  currentWeek?: number;
  paymentInterval: number;
  works: Work[];
  selectedGroup: string | undefined;
  showEmployees: boolean;
  showExtern: boolean;
  hoursSortOrder: string | undefined;
}

export class WorkFilter implements IWorkFilter {
  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();
  currentWeek?: number = undefined;
  paymentInterval = 2;
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
  showEmployees = true;
  showExtern = true;
  hoursSortOrder: string | undefined = undefined;
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
    } else if (value.length >= 2) {
      value = value.slice(-2);
      if (+value > 59) {
        value = '59';
      }
    } else if (value.length === 1) {
      value = '0' + value;
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
