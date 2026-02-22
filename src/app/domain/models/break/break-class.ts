// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Absence } from '../absence/absence-class';
import { Client } from '../client/client-class';
import { EntrySource } from '../../enums/entry-source.enum';
import { IBaseFilter } from '../general-class';
import { MultiLanguage } from '../translation/multi-language-class';
import { IPeriodHours, IScheduleCell } from '../schedule/work-schedule-class';

export interface IBreak {
  id: string | undefined;
  clientId: string;
  client: Client | undefined;
  absenceId: string;
  currentDate: Date;
  information: string | undefined;
  description?: MultiLanguage;
  lockLevel: number;
  sealedAt?: string;
  sealedBy?: string;
  workTime: number;
  surcharges: number;
  startTime: string;
  endTime: string;
  periodHours: IPeriodHours | undefined;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  scheduleEntries: IScheduleCell[] | undefined;
}

export class Break implements IBreak {
  id: string | undefined = undefined;
  clientId = '';
  client: Client | undefined = undefined;
  absenceId = '';
  currentDate: Date = new Date();
  information: string | undefined = undefined;
  description?: MultiLanguage = undefined;
  lockLevel = 0;
  sealedAt?: string = undefined;
  sealedBy?: string = undefined;
  workTime = 0;
  surcharges = 0;
  startTime = '00:00:00';
  endTime = '23:59:00';
  periodHours: IPeriodHours | undefined = undefined;
  periodStart: string | undefined = undefined;
  periodEnd: string | undefined = undefined;
  scheduleEntries: IScheduleCell[] | undefined = undefined;
}

export interface IBreakPlaceholder {
  id: string | undefined;
  clientId: string;
  client: Client | undefined;
  from: Date | undefined;
  until: Date | undefined;
  absenceId: string;
  absence: Absence | undefined;
  information: string | undefined;
  entrySource: EntrySource;
}

export class BreakPlaceholder implements IBreakPlaceholder {
  id = undefined;
  clientId = '';
  client: Client | undefined = undefined;
  from: Date | undefined = undefined;
  until: Date | undefined = undefined;
  absenceId = '';
  absence: Absence | undefined = undefined;
  information: string | undefined = undefined;
  entrySource: EntrySource = EntrySource.Placeholder;
}


export interface IAbsenceTokenFilter {
  id: string;
  name: string;
  checked: boolean;
}

export class AbsenceTokenFilter implements IAbsenceTokenFilter {
  id = '';
  name = '';
  checked = true;
}
export interface IBreakFilter extends IBaseFilter {
  currentYear: number;
  absences: AbsenceTokenFilter[];
  selectedGroup: string | undefined;
  startRow?: number;
  rowCount?: number;
  showEmployees: boolean;
  showExtern: boolean;
  hoursSortOrder: string | undefined;
  startDate?: string;
  endDate?: string;
}

export class BreakFilter implements IBreakFilter {
  currentYear = new Date().getFullYear();
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
  hoursSortOrder: string | undefined = undefined;
  startDate?: string;
  endDate?: string;
}
