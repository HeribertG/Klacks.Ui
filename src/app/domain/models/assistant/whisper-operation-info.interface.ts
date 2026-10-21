// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface WhisperOperationInfo {
  id: string;
  operationType: string;
  status: string;
  modelAlias: string | null;
  message: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
