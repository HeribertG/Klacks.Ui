// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
