// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PeriodCapPeriod, PeriodCapScope } from 'src/app/domain/enums/period-cap-rule.enums';

export interface IPeriodCapRule {
  id: string;
  period: PeriodCapPeriod;
  scope: PeriodCapScope;
  capHours: number;
  warnAtPercent: number | null;
  customPeriodWeeks: number | null;
  rollingWindowWeeks: number | null;
  maxAverageWeeklyHours: number | null;
  schedulingRuleId: string | null;
}
