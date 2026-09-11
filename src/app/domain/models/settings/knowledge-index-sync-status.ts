// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface KnowledgeIndexSyncStatus {
  isRunning: boolean;
  isPending: boolean;
  lastCompletedUtc: string | null;
  lastFailedUtc: string | null;
  lastReason: string | null;
  lastError: string | null;
}
