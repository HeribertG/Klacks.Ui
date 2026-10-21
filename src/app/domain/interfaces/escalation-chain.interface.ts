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

export const ESCALATION_CHAIN_STATUS_CANCELLED = 'Cancelled';
