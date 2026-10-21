// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IPeriodCapRule } from './period-cap-rule.interface';
import {
  PeriodCapPeriod,
  PeriodCapScope,
} from 'src/app/domain/enums/period-cap-rule.enums';

export class PeriodCapRule implements IPeriodCapRule {
  id = '';
  period: PeriodCapPeriod = PeriodCapPeriod.Month;
  scope: PeriodCapScope = PeriodCapScope.TotalHours;
  capHours = 0;
  warnAtPercent: number | null = null;
  customPeriodWeeks: number | null = null;
  rollingWindowWeeks: number | null = null;
  maxAverageWeeklyHours: number | null = null;
  schedulingRuleId: string | null = null;
}
