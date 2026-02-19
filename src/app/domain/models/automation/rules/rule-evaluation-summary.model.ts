export interface IRuleEvaluationSummary {
  totalRules: number;
  passed: number;
  warnings: number;
  violations: number;
  maxSeverity: number;
  allPassed: boolean;
}
