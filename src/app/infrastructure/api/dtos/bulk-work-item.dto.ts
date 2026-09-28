// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface BulkAddWorkItem {
  clientId: string;
  shiftId: string;
  currentDate: string;
  workTime: number;
  startTime: string;
  endTime: string;
  information?: string;
  analyseToken?: string;
}
