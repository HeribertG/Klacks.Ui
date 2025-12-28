import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { Absence } from './absence-class';
import { Client } from './client-class';
import { IBaseFilter } from './general-class';

export interface IBreakPlaceholder {
  id: string | undefined;
  clientId: string;
  client: Client | undefined;
  from: Date | undefined;
  internalFrom: NgbDateStruct | undefined;
  until: Date | undefined;
  internalUntil: NgbDateStruct | undefined;
  absenceId: string;
  absence: Absence | undefined;
  information: string | undefined;
}

export class BreakPlaceholder implements IBreakPlaceholder {
  id = undefined;
  clientId = '';
  client: Client | undefined = undefined;
  from: Date | undefined = undefined;
  internalFrom: NgbDateStruct | undefined = undefined;
  until: Date | undefined = undefined;
  internalUntil: NgbDateStruct | undefined = undefined;
  absenceId = '';
  absence: Absence | undefined = undefined;
  information: string | undefined = undefined;
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
}
