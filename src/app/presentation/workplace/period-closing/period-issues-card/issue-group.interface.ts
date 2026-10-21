// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PeriodIssue } from 'src/app/domain/models/period-closing/period-issue';

export interface IssueGroup {
  date: string;
  items: PeriodIssue[];
}
