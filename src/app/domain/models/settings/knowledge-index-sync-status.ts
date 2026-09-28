// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface KnowledgeIndexSyncStatus {
  isRunning: boolean;
  isPending: boolean;
  lastCompletedUtc: string | null;
  lastFailedUtc: string | null;
  lastReason: string | null;
  lastError: string | null;
}
