// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBreakFilter } from './break-filter.interface';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';
import { AbsenceTokenFilter } from './absence-token-filter-class';

export class BreakFilter implements IBreakFilter {
  currentYear = companyToday().getFullYear();
  absences: AbsenceTokenFilter[] = [];
  searchString = '';
  orderBy = 'name';
  sortOrder = 'asc';
  numberOfItemsPerPage = 5;
  requiredPage = 0;
  numberOfItemOnPreviousPage: number | undefined = undefined;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;
  selectedGroup: string | undefined = undefined;
  startRow?: number;
  rowCount?: number;
  showEmployees = true;
  showExtern = true;
  individualSort = false;
  startDate?: string;
  endDate?: string;
}
