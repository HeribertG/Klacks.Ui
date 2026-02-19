import { RuleType } from './rule-type.enum';
import { RuleSeverity } from './rule-severity.enum';

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
