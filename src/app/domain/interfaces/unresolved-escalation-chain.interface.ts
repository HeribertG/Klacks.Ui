// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
