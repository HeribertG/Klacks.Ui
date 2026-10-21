// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IRuleEvaluationResult {
  ruleId: string;
  passed: boolean;
  severity: number;
  message: string;
  details?: Record<string, unknown>;
}
