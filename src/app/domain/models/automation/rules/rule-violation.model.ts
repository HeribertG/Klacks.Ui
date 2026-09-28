// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { RuleType } from './rule-type.enum';

export interface IRuleViolation {
  ruleId: string;
  ruleName: string;
  ruleType: RuleType;
  severity: number;
  description: string;
  details?: Record<string, unknown>;
}
