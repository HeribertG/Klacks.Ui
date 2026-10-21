// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CounterEventType, CounterPeriod, RuleEnforcementMode } from 'src/app/domain/enums/counter-rule.enums';

export interface ICounterRule {
  id: string;
  eventType: CounterEventType;
  period: CounterPeriod;
  threshold: number;
  hoursThreshold: number | null;
  enforcement: RuleEnforcementMode | null;
  schedulingRuleId: string | null;
}
