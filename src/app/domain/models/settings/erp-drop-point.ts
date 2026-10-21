// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * DTOs for the automatically managed ERP drop point (single mailbox polled by the backend importer).
 * @param IErpDropPoint - Drop point as returned by the default endpoint
 */

export interface IErpDropPoint {
  id: string;
  name: string;
  sourceSystemId: string;
  bucketPrefix: string;
  isEnabled: boolean;
  lastPolledAt?: string;
  lastError?: string;
}
