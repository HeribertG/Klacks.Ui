// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ErrorListFilterType } from './error-list-filter-type.type';

export interface ScheduleErrorEntry {
  type: ErrorListFilterType;
  date: string;
  clientId: string;
  clientName: string;
  comment: string;
  commentParams?: Record<string, string>;
}
