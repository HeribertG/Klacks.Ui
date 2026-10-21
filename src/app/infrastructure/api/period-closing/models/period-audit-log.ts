// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PeriodAuditAction } from './period-audit-action.enum';

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
  performedByName: string | null;
}
