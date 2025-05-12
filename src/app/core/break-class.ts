import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { Absence } from './absence-class';
import { Client } from './client-class';

export interface IBreak {
  id: string | undefined;
  clientId: string;
  client: Client | undefined;
  from: Date | undefined;
  internalFrom: NgbDateStruct | undefined;
  until: Date | undefined;
  internalUntil: NgbDateStruct | undefined;
  absenceId: string;
  absence: Absence | undefined;
  description: string | undefined;
}

export class Break implements IBreak {
  id = undefined;
  clientId = '';
  client: Client | undefined = undefined;
  from: Date | undefined = undefined;
  internalFrom: NgbDateStruct | undefined = undefined;
  until: Date | undefined = undefined;
  internalUntil: NgbDateStruct | undefined = undefined;
  absenceId = '';
  absence: Absence | undefined = undefined;
  description: string | undefined = undefined;
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
export interface IBreakFilter {
  currentYear: number;
  absences: AbsenceTokenFilter[];
  search: string | undefined;
  orderBy: string | undefined;
  sortOrder: string | undefined;
  selectedGroup: string | undefined;
}

export class BreakFilter implements IBreakFilter {
  currentYear = new Date().getFullYear();
  absences: AbsenceTokenFilter[] = [];
  search = undefined;
  orderBy = 'name';
  sortOrder = 'asc';
  selectedGroup: string | undefined = undefined;
}
