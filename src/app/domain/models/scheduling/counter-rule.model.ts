// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ICounterRule } from './counter-rule.interface';
import {
  CounterEventType,
  CounterPeriod,
  RuleEnforcementMode,
} from 'src/app/domain/enums/counter-rule.enums';

export class CounterRule implements ICounterRule {
  id = '';
  eventType: CounterEventType = CounterEventType.NightShift;
  period: CounterPeriod = CounterPeriod.Week;
  threshold = 0;
  hoursThreshold: number | null = null;
  enforcement: RuleEnforcementMode | null = null;
  schedulingRuleId: string | null = null;
}
