// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface BreakCellParams {
  clientId: string;
  absenceId: string;
  date: Date;
  workTime: number;
  startTime: string;
  endTime: string;
  information?: string;
  description?: { de?: string; en?: string; fr?: string; it?: string };
}
