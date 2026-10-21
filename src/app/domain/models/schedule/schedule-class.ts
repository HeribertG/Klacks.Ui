// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IClient } from '../client/client-class';
import { IShift } from '../shift/shift.interface';
import { IPeriodHours } from './period-hours.interface';
import { IScheduleCell } from './schedule-cell.interface';
import { IWork } from './work.interface';
import { IWorkFilter } from './work-filter.interface';
import { companyToday } from 'src/app/shared/helpers/calendar-date.helper';

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
  analyseToken?: string;
}

export class WorkFilter implements IWorkFilter {
  currentMonth: number = companyToday().getMonth() + 1;
  currentYear: number = companyToday().getFullYear();
  currentWeek?: number = WorkFilter.getCurrentISOWeek();

  private static getCurrentISOWeek(): number {
    const date = companyToday();
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const thursday = date.getTime();
    date.setMonth(0);
    date.setDate(1);
    const jan1st = date.getTime();
    return Math.floor(Math.round((thursday - jan1st) / 86400000) / 7) + 1;
  }
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
  individualSort = false;
}
