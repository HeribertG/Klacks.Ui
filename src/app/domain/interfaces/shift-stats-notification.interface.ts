// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IShiftStatsNotification {
  shiftId: string;
  date: Date;
  engaged: number;
  sourceConnectionId: string;
  analyseToken?: string | null;
}
