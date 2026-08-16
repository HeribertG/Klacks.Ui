// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IEscalationRosterEntry {
  id: string;
  userId: string;
  displayName: string;
  effectiveRank: number | null;
  hasOverride: boolean;
  isOrphaned: boolean;
}

export interface IReorderEscalationRosterRequest {
  groupId: string;
  orderedUserIds: string[];
}
