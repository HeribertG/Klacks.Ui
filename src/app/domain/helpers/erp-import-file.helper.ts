// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure helpers over the ERP import file ledger rows: explicit pending/terminal status lists (an unknown future
 * status is neither), the "anything still pending / importing" checks of the polling, the status and channel
 * texts of a row, the order summary of one file or of summed counts (zero counters hidden), the count of rejected
 * orders that have no order reference (and are therefore not listed), the mapping of the API's fixed failure
 * reasons to i18n texts (parser messages and unknown reasons return null and are shown raw) and the text of a
 * refused upload (fixed validator messages translated, other messages shown raw).
 * @param status - Ledger status of one file
 * @param files - Listing grouped into inbox, processed and failed
 * @param file - One ledger row
 * @param counts - Order counters of one file or summed over several files
 * @param reason - Failure reason as stored by the API
 * @param channel - Entry path of a file (UI upload, token push, inbox folder)
 * @param body - Error body of a refused upload: a plain string or a ProblemDetails object with a detail
 */

import { ErpImportChannel } from 'src/app/domain/enums/erp-import-channel.enum';
import { ErpImportFileStatus } from 'src/app/domain/enums/erp-import-file-status.enum';
import { IErpDropPointFiles } from 'src/app/domain/models/settings/erp-drop-point-files.interface';
import { IErpImportFile } from 'src/app/domain/models/settings/erp-import-file';
import { IErpImportText } from 'src/app/domain/models/settings/erp-import-text';
import {
  ERP_DROP_POINT_I18N,
  ERP_IMPORT_FILE_FAILURE_REASONS,
  ERP_IMPORT_FILES_I18N,
  ERP_ORDER_UPLOAD_VALIDATION_MESSAGES,
} from 'src/app/domain/constants/erp-import-file.constants';

const COUNT_PARAM = 'count';
const DETAIL_PARAM = 'detail';
const PROCESSED_PARAM = 'processed';
const TOTAL_PARAM = 'total';
const PROBLEM_DETAIL_FIELD = 'detail';

type ErpImportOrderCounts = Pick<
  IErpImportFile,
  'newCount' | 'updatedCount' | 'unchangedCount' | 'supersededCount' | 'rejectedCount'
>;

const CHANNEL_KEYS: Readonly<Record<ErpImportChannel, string>> = {
  [ErpImportChannel.UiUpload]: ERP_IMPORT_FILES_I18N.CHANNEL_UI_UPLOAD,
  [ErpImportChannel.TokenPush]: ERP_IMPORT_FILES_I18N.CHANNEL_TOKEN_PUSH,
  [ErpImportChannel.InboxFolder]: ERP_IMPORT_FILES_I18N.CHANNEL_INBOX_FOLDER,
};

const STATUS_KEYS: Readonly<Partial<Record<ErpImportFileStatus, string>>> = {
  [ErpImportFileStatus.Received]: ERP_IMPORT_FILES_I18N.STATUS_RECEIVED,
  [ErpImportFileStatus.Completed]: ERP_IMPORT_FILES_I18N.STATUS_COMPLETED,
  [ErpImportFileStatus.CompletedWithWarnings]: ERP_IMPORT_FILES_I18N.STATUS_COMPLETED_WITH_WARNINGS,
};

const PENDING_STATUSES: readonly ErpImportFileStatus[] = [ErpImportFileStatus.Received, ErpImportFileStatus.Importing];

const TERMINAL_STATUSES: readonly ErpImportFileStatus[] = [
  ErpImportFileStatus.Completed,
  ErpImportFileStatus.CompletedWithWarnings,
  ErpImportFileStatus.Failed,
  ErpImportFileStatus.Interrupted,
];

const FAILED_STATUSES: readonly ErpImportFileStatus[] = [ErpImportFileStatus.Failed, ErpImportFileStatus.Interrupted];

const UPLOAD_REJECTION_KEYS: Readonly<Record<string, string>> = {
  [ERP_ORDER_UPLOAD_VALIDATION_MESSAGES.EmptyFile]: ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED_EMPTY_FILE,
  [ERP_ORDER_UPLOAD_VALIDATION_MESSAGES.EmptyFileName]: ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED_EMPTY_FILE_NAME,
  [ERP_ORDER_UPLOAD_VALIDATION_MESSAGES.InvalidExtension]: ERP_DROP_POINT_I18N.ERROR_INVALID_FILE_TYPE,
  [ERP_ORDER_UPLOAD_VALIDATION_MESSAGES.FileTooLarge]: ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED_FILE_TOO_LARGE,
};

const FIXED_FAILURE_REASON_KEYS: Readonly<Record<string, string>> = {
  [ERP_IMPORT_FILE_FAILURE_REASONS.StaleHeartbeat]: ERP_IMPORT_FILES_I18N.FAILURE_STALE_HEARTBEAT,
  [ERP_IMPORT_FILE_FAILURE_REASONS.FileChangedAfterReceipt]: ERP_IMPORT_FILES_I18N.FAILURE_FILE_CHANGED,
  [ERP_IMPORT_FILE_FAILURE_REASONS.StoredFileMissing]: ERP_IMPORT_FILES_I18N.FAILURE_FILE_MISSING,
  [ERP_IMPORT_FILE_FAILURE_REASONS.LegacyImportInterrupted]: ERP_IMPORT_FILES_I18N.FAILURE_LEGACY_INTERRUPTED,
  [ERP_IMPORT_FILE_FAILURE_REASONS.LegacyErrorWithoutReason]: ERP_IMPORT_FILES_I18N.FAILURE_LEGACY_ERROR,
  [ERP_IMPORT_FILE_FAILURE_REASONS.LedgerEntryMissing]: ERP_IMPORT_FILES_I18N.FAILURE_LEDGER_ENTRY_MISSING,
  [ERP_IMPORT_FILE_FAILURE_REASONS.FileTooLarge]: ERP_IMPORT_FILES_I18N.FAILURE_FILE_TOO_LARGE,
};

export function isErpImportFileTerminal(status: ErpImportFileStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isErpImportFilePending(status: ErpImportFileStatus): boolean {
  return PENDING_STATUSES.includes(status);
}

export function isErpImportFileFailed(status: ErpImportFileStatus): boolean {
  return FAILED_STATUSES.includes(status);
}

export function allErpImportFiles(files: IErpDropPointFiles): IErpImportFile[] {
  return [...files.inbox, ...files.processed, ...files.failed];
}

export function hasPendingErpImportFiles(files: IErpDropPointFiles): boolean {
  return allErpImportFiles(files).some((file) => isErpImportFilePending(file.status));
}

export function hasImportingErpImportFiles(files: IErpDropPointFiles): boolean {
  return allErpImportFiles(files).some((file) => file.status === ErpImportFileStatus.Importing);
}

export function erpImportChannelKey(channel: ErpImportChannel): string {
  return CHANNEL_KEYS[channel] ?? ERP_IMPORT_FILES_I18N.CHANNEL_INBOX_FOLDER;
}

export function erpImportStatusText(file: IErpImportFile): IErpImportText | null {
  if (file.status === ErpImportFileStatus.Importing) {
    return file.totalOrders === null || file.totalOrders === undefined
      ? { key: ERP_IMPORT_FILES_I18N.STATUS_IMPORTING, params: {} }
      : {
          key: ERP_IMPORT_FILES_I18N.STATUS_IMPORTING_PROGRESS,
          params: { [PROCESSED_PARAM]: file.processedOrders, [TOTAL_PARAM]: file.totalOrders },
        };
  }

  const key = STATUS_KEYS[file.status];
  return key ? { key, params: {} } : null;
}

export function erpImportSummary(file: IErpImportFile): IErpImportText[] {
  if (file.totalOrders === null || file.totalOrders === undefined) {
    return [];
  }

  return erpImportCountSummary(file);
}

export function erpImportCountSummary(counts: ErpImportOrderCounts): IErpImportText[] {
  const parts: IErpImportText[] = [
    { key: ERP_IMPORT_FILES_I18N.SUMMARY_NEW, params: { [COUNT_PARAM]: counts.newCount } },
    { key: ERP_IMPORT_FILES_I18N.SUMMARY_UPDATED, params: { [COUNT_PARAM]: counts.updatedCount } },
    { key: ERP_IMPORT_FILES_I18N.SUMMARY_UNCHANGED, params: { [COUNT_PARAM]: counts.unchangedCount } },
    { key: ERP_IMPORT_FILES_I18N.SUMMARY_SUPERSEDED, params: { [COUNT_PARAM]: counts.supersededCount } },
    { key: ERP_IMPORT_FILES_I18N.SUMMARY_REJECTED, params: { [COUNT_PARAM]: counts.rejectedCount } },
  ];
  const nonZero = parts.filter((part) => part.params[COUNT_PARAM] !== 0);
  return nonZero.length > 0 ? nonZero : parts.slice(0, 1);
}

export function sumErpImportCounts(files: readonly IErpImportFile[]): ErpImportOrderCounts {
  return files.reduce<ErpImportOrderCounts>(
    (sum, file) => ({
      newCount: sum.newCount + file.newCount,
      updatedCount: sum.updatedCount + file.updatedCount,
      unchangedCount: sum.unchangedCount + file.unchangedCount,
      supersededCount: sum.supersededCount + file.supersededCount,
      rejectedCount: sum.rejectedCount + file.rejectedCount,
    }),
    { newCount: 0, updatedCount: 0, unchangedCount: 0, supersededCount: 0, rejectedCount: 0 },
  );
}

export function erpImportRejectedWithoutReference(file: IErpImportFile): number {
  return Math.max(0, file.rejectedCount - file.rejectedOrders.length);
}

export function erpImportFailureReasonText(reason: string | null | undefined): IErpImportText | null {
  if (!reason) {
    return null;
  }

  const fixedKey = FIXED_FAILURE_REASON_KEYS[reason];
  if (fixedKey) {
    return { key: fixedKey, params: {} };
  }

  if (reason.startsWith(ERP_IMPORT_FILE_FAILURE_REASONS.ImportAbortedPrefix)) {
    return {
      key: ERP_IMPORT_FILES_I18N.FAILURE_IMPORT_ABORTED,
      params: { [DETAIL_PARAM]: reason.substring(ERP_IMPORT_FILE_FAILURE_REASONS.ImportAbortedPrefix.length) },
    };
  }

  return null;
}

export function erpImportUploadRejectionText(body: unknown): IErpImportText | null {
  const message = uploadRejectionMessage(body)?.trim();
  if (!message) {
    return null;
  }

  const fixedKey = UPLOAD_REJECTION_KEYS[message];
  return fixedKey
    ? { key: fixedKey, params: {} }
    : { key: ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED, params: { [DETAIL_PARAM]: message } };
}

function uploadRejectionMessage(body: unknown): string | null {
  if (typeof body === 'string') {
    return body;
  }
  const detail = (body as { [PROBLEM_DETAIL_FIELD]?: unknown } | null)?.[PROBLEM_DETAIL_FIELD];
  return typeof detail === 'string' ? detail : null;
}
