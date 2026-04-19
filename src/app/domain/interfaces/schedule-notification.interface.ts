// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IScheduleNotification {
  clientId: string;
  currentDate: Date;
  periodStartDate: string;
  periodEndDate: string;
  operationType: string;
  sourceConnectionId: string;
  analyseToken?: string | null;
}
