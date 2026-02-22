// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IShiftStatsNotification {
  shiftId: string;
  date: Date;
  engaged: number;
  sourceConnectionId: string;
}
