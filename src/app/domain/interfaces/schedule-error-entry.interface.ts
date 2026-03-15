// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export type ErrorListFilterType = 'error' | 'warning' | 'info';

export interface ScheduleErrorEntry {
  type: ErrorListFilterType;
  date: string;
  clientId: string;
  clientName: string;
  comment: string;
  commentParams?: Record<string, string>;
}
