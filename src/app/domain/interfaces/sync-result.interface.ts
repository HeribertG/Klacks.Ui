// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISyncResult {
  success: boolean;
  totalProcessed: number;
  newClients: number;
  updatedClients: number;
  deactivatedClients: number;
  errorMessage?: string;
  syncTime: string;
}
