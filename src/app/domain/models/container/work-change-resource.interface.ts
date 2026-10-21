// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface WorkChangeResource {
  id: string;
  workId: string;
  changeTime: number;
  surcharges: number;
  startTime: string;
  endTime: string;
  type: number;
  replaceClientId: string | null;
  description: string;
  toInvoice: boolean;
}
