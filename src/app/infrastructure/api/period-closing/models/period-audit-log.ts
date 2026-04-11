// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export enum PeriodAuditAction {
  Seal = 0,
  Unseal = 1,
}

export interface PeriodAuditLog {
  id: string;
  action: PeriodAuditAction;
  startDate: string;
  endDate: string;
  groupId: string | null;
  groupName: string | null;
  reason: string | null;
  affectedCount: number;
  performedAt: string;
  performedBy: string;
}
