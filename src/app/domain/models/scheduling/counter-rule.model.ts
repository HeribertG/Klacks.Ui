// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  CounterEventType,
  CounterPeriod,
  RuleEnforcementMode,
} from 'src/app/domain/enums/counter-rule.enums';

export interface ICounterRule {
  id: string;
  eventType: CounterEventType;
  period: CounterPeriod;
  threshold: number;
  hoursThreshold: number | null;
  enforcement: RuleEnforcementMode | null;
  schedulingRuleId: string | null;
}

export class CounterRule implements ICounterRule {
  id = '';
  eventType: CounterEventType = CounterEventType.NightShift;
  period: CounterPeriod = CounterPeriod.Week;
  threshold = 0;
  hoursThreshold: number | null = null;
  enforcement: RuleEnforcementMode | null = null;
  schedulingRuleId: string | null = null;
}
