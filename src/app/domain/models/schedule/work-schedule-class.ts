// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IScheduleCell {
  id: string;
  entryType: number;
  sourceId: string;
  clientId: string;
  entryDate: Date;
  startTime: string;
  endTime: string;
  changeTime: number | null;
  surcharges: number | null;
  workChangeType: number | null;
  description: { de?: string; en?: string; fr?: string; it?: string } | null;
  information: string | null;
  amount: number | null;
  toInvoice: boolean | null;
  taxable: boolean | null;
  entryId: string;
  entryName: string | null;
  abbreviation: string | null;
  replaceClientId: string | null;
  isReplacementEntry: boolean;
  lockLevel: number;
  isGroupRestricted: boolean;
}

export class ScheduleCell implements IScheduleCell {
  id = '';
  entryType = 0;
  sourceId = '';
  clientId = '';
  entryDate: Date = new Date();
  startTime = '';
  endTime = '';
  changeTime: number | null = null;
  surcharges: number | null = null;
  workChangeType: number | null = null;
  description: { de?: string; en?: string; fr?: string; it?: string } | null = null;
  information: string | null = null;
  amount: number | null = null;
  toInvoice: boolean | null = null;
  taxable: boolean | null = null;
  entryId = '';
  entryName: string | null = null;
  abbreviation: string | null = null;
  replaceClientId: string | null = null;
  isReplacementEntry = false;
  lockLevel = 0;
  isGroupRestricted = false;
}

export interface IWorkScheduleFilter {
  startDate: string;
  endDate: string;
  selectedGroup?: string;
  searchString?: string;
  orderBy?: string;
  sortOrder?: string;
  showEmployees?: boolean;
  showExtern?: boolean;
  hoursSortOrder?: string;
  startRow?: number;
  rowCount?: number;
  paymentInterval?: number;
  analyseToken?: string;
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
  hasContract: boolean;
}

export interface IWorkScheduleResponse {
  entries: IScheduleCell[];
  clients: IWorkScheduleClient[];
  periodHours: Record<string, IPeriodHours>;
  clientAvailabilities: Record<string, Record<string, string>>;
  totalClientCount: number;
  startDate: string;
  endDate: string;
}

export interface IPeriodHours {
  hours: number;
  surcharges: number;
  guaranteedHours: number;
}

export interface IPeriodHoursRequest {
  clientIds: string[];
  startDate: string;
  endDate: string;
}

export enum WorkScheduleEntryType {
  Work = 0,
  WorkChange = 1,
  Expenses = 2,
  Break = 3,
  ScheduleNote = 4,
}

export type WorkScheduleByDate = Map<string, IScheduleCell[]>;
export type WorkScheduleByClientAndDate = Map<string, WorkScheduleByDate>;
