// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
export const ESCALATION_STAGE_STATUS_NOTIFIED = 'Notified';
export const ESCALATION_STAGE_STATUS_PENDING = 'Pending';

export interface IEscalationAcknowledgeResult {
  outcome: string;
  chainStatus: string | null;
}

export const ESCALATION_CHAIN_STATUS_CANCELLED = 'Cancelled';

export interface IUnresolvedEscalationChain {
  id: string;
  purpose: string;
  status: string;
  absentClientName: string;
  shiftStartUtc: string | null;
  groupId: string | null;
  groupName: string | null;
  findingKind: string | null;
  endedAtUtc: string | null;
  cancelledByUserName: string | null;
  cancelReason: string | null;
  cancelReasonHidden: boolean;
  notifiedStageCount: number;
  scenarioStatus: string | null;
  scenarioId: string | null;
}

export interface IEscalationChainSummary {
  id: string;
  purpose: string;
  workId: string | null;
  conditionId: string | null;
  absentClientName: string;
  shiftStartUtc: string | null;
  deadlineUtc: string;
  startedAtUtc: string | null;
  groupName: string | null;
  findingKind: string | null;
  groupId: string | null;
  scenarioId: string | null;
  wakeNotBeforeUtc: string | null;
  canAcknowledge: boolean;
  canCancel: boolean;
  stages: IEscalationStageSummary[];
}
