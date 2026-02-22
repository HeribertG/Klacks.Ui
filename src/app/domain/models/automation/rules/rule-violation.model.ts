// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { RuleType } from './rule-type.enum';

export interface IRuleViolation {
  ruleId: string;
  ruleName: string;
  ruleType: RuleType;
  severity: number;
  description: string;
  details?: Record<string, unknown>;
}
