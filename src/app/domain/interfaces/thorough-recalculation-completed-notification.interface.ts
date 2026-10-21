// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IThoroughRecalculationCompletedNotification {
  startDate: string;
  endDate: string;
  selectedGroup?: string | null;
  analyseToken?: string | null;
  processedWorks: number;
  processedWorkChanges: number;
  processedBreaks: number;
}
