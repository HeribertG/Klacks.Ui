// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ShiftDropResult {
  shiftId: string;
  shiftName: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  workTime: number;
  targetRow: number;
  targetColumn: number;
  targetClientId: string;
  targetDate: Date;
}
