// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ScheduleCellParams {
  clientId: string;
  date: Date;
  shiftId: string;
  workTime: number;
  startTime: string;
  endTime: string;
  information?: string;
}
