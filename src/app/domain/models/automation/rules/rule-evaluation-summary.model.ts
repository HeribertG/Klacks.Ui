// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IRuleEvaluationSummary {
  totalRules: number;
  passed: number;
  warnings: number;
  violations: number;
  maxSeverity: number;
  allPassed: boolean;
}
