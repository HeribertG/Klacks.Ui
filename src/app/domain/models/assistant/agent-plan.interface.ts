// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PlanStatusValue } from './plan-status-value.type';

export const PlanStatus = {
  Drafting: 'drafting',
  Executing: 'executing',
  PausedForApproval: 'paused_for_approval',
  Completed: 'completed',
  Aborted: 'aborted',
  Failed: 'failed',
} as const;

export interface IAgentPlan {
  id: string;
  agentId: string;
  userId?: string;
  sessionId?: string;
  goal: string;
  stepsJson: string;
  status: PlanStatusValue;
  currentStepIndex: number;
  lastErrorMessage?: string | null;
  createTime?: string;
}
