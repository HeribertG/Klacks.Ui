// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IPeriodHours, IScheduleCell } from '../schedule/work-schedule-class';

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
  currentDate: string;
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
  TravelStart = 4,
  TravelEnd = 5,
  TravelWithin = 6,
  Briefing = 7,
  Debriefing = 8,
  ReplacementWithin = 9,
  OnCallPresence = 10,
  OnCallStandby = 11,
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
