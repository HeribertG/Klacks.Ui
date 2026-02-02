export enum SkillCategory {
  Crud = 'Crud',
  Query = 'Query',
  Action = 'Action',
  UI = 'UI',
  System = 'System'
}

export enum SkillParameterType {
  String = 'String',
  Integer = 'Integer',
  Decimal = 'Decimal',
  Boolean = 'Boolean',
  Date = 'Date',
  Time = 'Time',
  DateTime = 'DateTime',
  Array = 'Array',
  Object = 'Object',
  Enum = 'Enum'
}

export enum SkillResultType {
  Data = 'Data',
  Navigation = 'Navigation',
  UI = 'UI',
  Error = 'Error',
  Cancelled = 'Cancelled',
  Confirmation = 'Confirmation'
}

export interface ISkillParameter {
  name: string;
  description: string;
  type: SkillParameterType;
  required: boolean;
  defaultValue?: unknown;
  enumValues?: string[];
}

export interface ISkillDefinition {
  name: string;
  description: string;
  category: SkillCategory;
  parameters: ISkillParameter[];
  requiredPermissions: string[];
}

export interface ISkillExecuteRequest {
  skillName: string;
  parameters: Record<string, unknown>;
}

export interface ISkillExecuteResponse {
  success: boolean;
  data?: unknown;
  message?: string;
  resultType: SkillResultType;
  metadata?: Record<string, unknown>;
}

export interface ISkillChainExecuteRequest {
  invocations: ISkillInvocation[];
}

export interface ISkillInvocation {
  skillName: string;
  parameters: Record<string, unknown>;
  stopOnError?: boolean;
}

export interface ISkillImplementation {
  execute(params: Record<string, unknown>): Promise<ISkillExecuteResponse>;
}

export interface ISkillUsageSummary {
  skillName: string;
  executionCount: number;
  successRate: number;
  avgDurationMs: number;
}

export interface IDailyUsage {
  date: string;
  executions: number;
  successes: number;
}

export interface ISkillAnalytics {
  totalExecutions: number;
  successRate: number;
  mostUsedSkills: ISkillUsageSummary[];
  usageByCategory: Record<string, number>;
  usageOverTime: IDailyUsage[];
}
