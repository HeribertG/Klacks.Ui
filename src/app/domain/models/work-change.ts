import { IPeriodHours, IScheduleCell } from './work-schedule-class';

export interface WorkChangeRequest {
  workId: string;
  type: WorkChangeType;
  changeTime: number;
  surcharges: number;
  startTime: string;
  endTime: string;
  description: string;
  toInvoice: boolean;
  replaceClientId: string | null;
}

export interface WorkChangeClientResult {
  clientId: string;
  periodHours?: IPeriodHours;
  scheduleEntries?: IScheduleCell[];
}

export interface WorkChangeWorkInfo {
  id: string;
  clientId: string;
  startTime: string;
  endTime: string;
}

export interface WorkChangeResource {
  id: string;
  workId: string;
  work?: WorkChangeWorkInfo;
  type: WorkChangeType;
  changeTime: number;
  surcharges: number;
  startTime: string;
  endTime: string;
  description: string;
  toInvoice: boolean;
  replaceClientId: string | null;
  periodStart?: string;
  periodEnd?: string;
  clientResults?: WorkChangeClientResult[];
}

export enum WorkChangeType {
  CorrectionEnd = 0,
  CorrectionStart = 1,
  ReplacementStart = 2,
  ReplacementEnd = 3,
}

export interface WorkTimeContext {
  workStartTime: string;
  workEndTime: string;
  crossesMidnight: boolean;
}

export interface WorkChangeValidation {
  isValid: boolean;
  changeTime: number;
  errorKey?: string;
}
