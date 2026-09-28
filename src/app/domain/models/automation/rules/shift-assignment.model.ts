// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IShiftAssignment {
  shiftId: string;
  shiftName: string;
  date: Date;
  startTime: string;
  endTime: string;
  hours: number;
}
