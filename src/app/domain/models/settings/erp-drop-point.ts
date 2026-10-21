// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * DTOs for the automatically managed ERP drop point (single mailbox polled by the backend importer).
 * @param IErpDropPoint - Drop point as returned by the default endpoint
 * @param IErpDropPointRequest - Update request body (used to toggle the import on and off)
 * @param IErpDropPointFiles - Import ledger rows grouped by tab (inbox: received or importing, processed: completed
 *   with or without warnings, newest 200; failed: failed or interrupted), each list newest received first
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
