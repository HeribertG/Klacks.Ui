// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface WhisperOperationResult {
  enqueued: boolean;
  operationId: string | null;
  reason: string;
}
