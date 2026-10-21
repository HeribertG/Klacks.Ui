// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface BroadcastSendResult {
  broadcastId: string;
  total: number;
  sent: number;
  failed: number;
  skippedNoContact: number;
}
