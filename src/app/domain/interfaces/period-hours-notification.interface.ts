// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IPeriodHoursNotification {
  clientId: string;
  startDate: string;
  endDate: string;
  hours: number;
  surcharges: number;
  guaranteedHours: number;
  sourceConnectionId: string;
  analyseToken?: string | null;
}

export interface IPeriodHoursRecalculatedNotification {
  startDate: string;
  endDate: string;
  analyseToken?: string | null;
}

export interface IThoroughRecalculationCompletedNotification {
  startDate: string;
  endDate: string;
  selectedGroup?: string | null;
  analyseToken?: string | null;
  processedWorks: number;
  processedWorkChanges: number;
  processedBreaks: number;
}
