// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WorkChangeType } from './work-change-type.enum';

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
