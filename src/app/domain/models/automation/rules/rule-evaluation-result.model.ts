export interface IRuleEvaluationResult {
  ruleId: string;
  passed: boolean;
  severity: number;
  message: string;
  details?: Record<string, unknown>;
}

export class RuleEvaluationResult implements IRuleEvaluationResult {
  constructor(
    public ruleId: string,
    public passed: boolean,
    public severity = 0,
    public message = '',
    public details?: Record<string, unknown>
  ) {}

  static passed(ruleId: string): RuleEvaluationResult {
    return new RuleEvaluationResult(ruleId, true, 0, 'Rule passed');
  }

  static failed(ruleId: string, severity: number, message: string, details?: Record<string, unknown>): RuleEvaluationResult {
    return new RuleEvaluationResult(ruleId, false, severity, message, details);
  }
}
