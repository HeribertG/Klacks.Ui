// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IClientImportCommitResult {
  batchId: string;
  created: number;
  skipped: number;
  geocodingQueued: number;
}
