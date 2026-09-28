// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IScheduleNotification {
  clientId: string;
  currentDate: Date;
  periodStartDate: string;
  periodEndDate: string;
  operationType: string;
  sourceConnectionId: string;
  analyseToken?: string | null;
}
