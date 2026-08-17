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

export interface IEscalationChainSummary {
  id: string;
  workId: string;
  absentClientName: string;
  shiftStartUtc: string;
  deadlineUtc: string;
  canAcknowledge: boolean;
  stages: IEscalationStageSummary[];
}
