// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One delivered ERP order file of the import ledger as returned by the drop-point file listing.
 * @param status - Effective lifecycle status (a stale import is already reported as Interrupted by the API)
 * @param channel - How the file arrived (UI upload, token push or inbox folder)
 * @param uploadedBy - Uploader name for UI uploads, token name for pushes, null for inbox-folder files
 * @param receivedAt / startedAt / finishedAt - Instants (UTC wire values), never calendar dates
 * @param totalOrders - Parsed order count; null for rows migrated from the pre-ledger folders (no summary known)
 * @param rejectedCount - All rejected orders; rejectedOrders lists only those that carry an order reference
 * @param duplicateOfReceivedAt - Receipt instant of an earlier delivery with identical content (hint only)
 */

import { ErpImportChannel } from 'src/app/domain/enums/erp-import-channel.enum';
import { ErpImportFileStatus } from 'src/app/domain/enums/erp-import-file-status.enum';
import { IErpImportRejectedOrder } from 'src/app/domain/models/settings/erp-import-rejected-order';

export interface IErpImportFile {
  id: string;
  fileName: string;
  sizeBytes: number;
  status: ErpImportFileStatus;
  channel: ErpImportChannel;
  uploadedBy: string | null;
  receivedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  processedOrders: number;
  totalOrders: number | null;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  supersededCount: number;
  rejectedCount: number;
  failureReason: string | null;
  duplicateOfReceivedAt: string | null;
  rejectedOrders: IErpImportRejectedOrder[];
}
