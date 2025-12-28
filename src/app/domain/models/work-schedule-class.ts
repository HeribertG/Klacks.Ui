export interface IWorkScheduleEntry {
  id: string;
  entryType: number;
  workId: string;
  clientId: string;
  entryDate: Date;
  startShift: string;
  endShift: string;
  changeTime: number | null;
  workChangeType: number | null;
  description: string | null;
  amount: number | null;
  toInvoice: boolean | null;
  taxable: boolean | null;
  shiftId: string;
  shiftName: string | null;
  abbreviation: string | null;
  replaceClientId: string | null;
  isReplacementEntry: boolean;
}

export class WorkScheduleEntry implements IWorkScheduleEntry {
  id = '';
  entryType = 0;
  workId = '';
  clientId = '';
  entryDate: Date = new Date();
  startShift = '';
  endShift = '';
  changeTime: number | null = null;
  workChangeType: number | null = null;
  description: string | null = null;
  amount: number | null = null;
  toInvoice: boolean | null = null;
  taxable: boolean | null = null;
  shiftId = '';
  shiftName: string | null = null;
  abbreviation: string | null = null;
  replaceClientId: string | null = null;
  isReplacementEntry = false;
}

export interface IWorkScheduleFilter {
  startDate: string;
  endDate: string;
  selectedGroup?: string;
  orderBy?: string;
  sortOrder?: string;
  showEmployees?: boolean;
  showExtern?: boolean;
  hoursSortOrder?: string;
}

export interface IWorkScheduleClient {
  id: string;
  company: string | null;
  firstName: string | null;
  name: string | null;
  secondName: string | null;
  title: string | null;
  maidenName: string | null;
  gender: number;
  idNumber: number;
  legalEntity: boolean;
  type: number;
  neededRows: number;
}

export interface IWorkScheduleResponse {
  entries: IWorkScheduleEntry[];
  clients: IWorkScheduleClient[];
  monthlyHours: { [clientId: string]: IMonthlyHours };
}

export interface IMonthlyHours {
  hours: number;
  surcharges: number;
  guaranteedHoursPerMonth: number;
}

export enum WorkScheduleEntryType {
  Work = 0,
  WorkChange = 1,
  Expenses = 2,
}

export type WorkScheduleByDate = Map<string, IWorkScheduleEntry[]>;
export type WorkScheduleByClientAndDate = Map<string, WorkScheduleByDate>;
