// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ErrorListFilterType } from './error-list-filter-type.type';

export interface ScheduleErrorEntry {
  type: ErrorListFilterType;
  date: string;
  clientId: string;
  clientName: string;
  comment: string;
  commentParams?: Record<string, string>;
}
