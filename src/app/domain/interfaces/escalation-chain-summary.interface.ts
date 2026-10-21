// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IEscalationStageSummary } from './escalation-chain.interface';

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
