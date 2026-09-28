// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IShiftHistory {
  shiftId: string;
  shiftName: string;
  count: number;
  lastDate: Date | null;
  totalHours: number;
  averageSatisfaction: number;
}
