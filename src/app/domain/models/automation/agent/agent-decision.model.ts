// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
