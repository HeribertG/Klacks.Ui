// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  PeriodCapPeriod,
  PeriodCapScope,
} from 'src/app/domain/enums/period-cap-rule.enums';

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
