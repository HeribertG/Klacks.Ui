// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleCell } from './schedule-cell.interface';

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

export enum WorkScheduleEntryType {
  Work = 0,
  WorkChange = 1,
  Expenses = 2,
  Break = 3,
  ScheduleNote = 4,
  ScheduleCommand = 5,
}

export type WorkScheduleByDate = Map<string, IScheduleCell[]>;
export type WorkScheduleByClientAndDate = Map<string, WorkScheduleByDate>;
