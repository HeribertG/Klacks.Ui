// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WorkChangeWorkInfo } from './work-change-work-info.interface';
import { WorkChangeType } from './work-change-type.enum';
import { WorkChangeClientResult } from './work-change-client-result.interface';

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
