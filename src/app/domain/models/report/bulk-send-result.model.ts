// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface BulkSendResult {
  success: number;
  failed: number;
  noEmail: number;
  errors: { clientName: string; error: string }[];
}
