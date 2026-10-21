// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAgentPlanStep } from 'src/app/domain/models/assistant/agent-plan-step.interface';
import { StepStatus } from './step-status.type';

export interface IPlanStepRow {
  index: number;
  step: IAgentPlanStep;
  status: StepStatus;
}
