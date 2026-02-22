// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IScheduleAgent } from './schedule-agent.model';
import { IRuleViolation } from '../rules/rule-violation.model';

export interface IAgentDecision {
  agent: IScheduleAgent;
  shiftId: string;
  shiftName: string;
  motivationScore: number;
  ruleViolations: IRuleViolation[];
  acceptanceProbability: number;
}
