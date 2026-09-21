// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IEscalationStageSummary {
  rank: number;
  userId: string;
  userDisplayName: string;
  status: string;
  notifiedAtUtc: string | null;
  dueAtUtc: string | null;
  respondedAtUtc: string | null;
}

export const ESCALATION_PURPOSE_ABSENCE_COVERAGE = 'AbsenceCoverage';
export const ESCALATION_PURPOSE_PROACTIVE_APPROVAL = 'ProactiveApproval';

export const ESCALATION_ACKNOWLEDGE_OUTCOME_CHAIN_ALREADY_RESOLVED = 'ChainAlreadyResolved';
export const ESCALATION_CHAIN_STATUS_EXHAUSTED = 'Exhausted';

export interface IEscalationAcknowledgeResult {
  outcome: string;
  chainStatus: string | null;
}

export interface IEscalationChainSummary {
  id: string;
  purpose: string;
  workId: string | null;
  conditionId: string | null;
  absentClientName: string;
  shiftStartUtc: string | null;
  deadlineUtc: string;
  canAcknowledge: boolean;
  stages: IEscalationStageSummary[];
}
