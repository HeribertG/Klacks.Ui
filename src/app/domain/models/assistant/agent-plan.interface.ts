// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export const PlanStatus = {
  Drafting: 'drafting',
  Executing: 'executing',
  PausedForApproval: 'paused_for_approval',
  Completed: 'completed',
  Aborted: 'aborted',
  Failed: 'failed',
} as const;

export type PlanStatusValue = (typeof PlanStatus)[keyof typeof PlanStatus];

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

export interface IAgentPlanStep {
  order: number;
  skill: string;
  params: Record<string, unknown>;
  verifySkill?: string | null;
  reversible: boolean;
}

export interface IAgentPlanUpdate {
  planId: string;
  status: PlanStatusValue;
  currentStepIndex: number;
  totalSteps: number;
  lastErrorMessage?: string | null;
  timestamp: string;
}
