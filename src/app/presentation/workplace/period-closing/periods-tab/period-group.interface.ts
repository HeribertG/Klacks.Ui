// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { UsedPeriod } from 'src/app/domain/models/period-closing/used-period';

export interface PeriodGroup {
  intervalKey: string;
  periods: UsedPeriod[];
}
