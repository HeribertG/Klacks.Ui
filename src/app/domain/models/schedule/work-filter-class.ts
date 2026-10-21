// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Filter state of the schedule (month, year, ISO week of company today, group, paging and visibility flags).
 */

import { IWorkFilter } from './work-filter.interface';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';
import { Work } from './schedule-class';

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
