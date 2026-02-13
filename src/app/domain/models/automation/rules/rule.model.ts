export enum RuleType {
  WorkQuant = 'workQuant',
  PauseDuration = 'pauseDuration',
  OptimalPause = 'optimalPause',
  ConsecutiveDays = 'consecutiveDays',
  DailyHours = 'dailyHours',
  WeeklyHours = 'weeklyHours',
  Custom = 'custom'
}

export enum RuleSeverity {
  Info = 0,
  Warning = 1,
  Violation = 2
}

export interface IRuleViolation {
  ruleId: string;
  ruleName: string;
  ruleType: RuleType;
  severity: number;
  description: string;
  details?: Record<string, unknown>;
}

export interface IWorkQuant {
  startDate: Date;
  endDate: Date;
  workDays: number;
  restDays: number;
  isComplete: boolean;
}

export interface IShiftAssignment {
  shiftId: string;
  shiftName: string;
  date: Date;
  startTime: string;
  endTime: string;
  hours: number;
}

export interface IScheduleContext {
  agentId: string;
  currentDate: Date;
  proposedAssignment: IShiftAssignment;
  existingAssignments: IShiftAssignment[];
  workQuants: IWorkQuant[];
}

export interface IRuleDefinition {
  id: string;
  name: string;
  type: RuleType;
  description: string;
  severity: RuleSeverity;
  isActive: boolean;
  script: string;
  parameters?: Record<string, unknown>;
}

export class RuleDefinition implements IRuleDefinition {
  constructor(
    public id: string,
    public name: string,
    public type: RuleType,
    public description: string,
    public severity: RuleSeverity = RuleSeverity.Violation,
    public isActive = true,
    public script = '',
    public parameters: Record<string, unknown> = {}
  ) {}
}

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
