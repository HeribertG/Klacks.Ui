// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the ERP import file ledger UI: the backend path of the drop-point file endpoints (also the
 * interceptor's quiet caller-handled path), the polling cadence, the list caps, the i18n keys, the fixed failure
 * reasons the API stores and the fixed upload validation messages.
 * @param ERP_DROP_POINT_FILES_PATH - Backend path of listing, upload, retry and delete of drop-point files
 * @param ERP_IMPORT_POLLING - Backoff delays between polls (polls at 0, 2, 6, 14 s, then every 30 s: 44, 74, 104 s
 *   ...), the 10 minute cap, the consecutive failed polls that end a session, and the grace period after "run import
 *   now". The API only queues that run: TriggerErpImportRunCommandHandler sets the next run to now + 10 s
 *   (write-stability window) and ErpOrderImportBackgroundService ticks every 60 s, so the run starts 10 to 70 s
 *   after the click and registers inbox-folder files only then. The grace is compared with the scheduled offset of
 *   each poll (not with the response time), so the poll at 104 s is always the first one allowed to end a session
 *   in which nothing is pending
 * @param ERP_IMPORT_LIST_LIMITS - Processed rows the API returns (mirror of ErpImportFileTiming.ProcessedListingCap),
 *   rejected orders shown per file before "+N more", and finished files per listing from which one aggregate toast
 *   replaces the per-file toasts
 * @param ERP_IMPORT_FILE_FAILURE_REASONS - Verbatim mirror of the file-level reasons in
 *   Klacks.Api/Domain/Constants/ErpImportFileFailureReasons.cs; ImportAbortedPrefix is followed by the raw error
 *   message; parser messages and order-level rejection reasons (ConcurrentOpenDraft) are not listed and stay raw
 * @param ERP_ORDER_UPLOAD_VALIDATION_MESSAGES - Verbatim mirror of the messages in
 *   Klacks.Api/Application/Validation/Imports/ErpOrderFileUploadValidator.cs (a refused upload's 400 body)
 */

export const ERP_DROP_POINT_FILES_PATH = 'ErpDropPoints/files';

export const ERP_IMPORT_POLLING = {
  BACKOFF_DELAYS_MS: [2000, 4000, 8000] as readonly number[],
  STEADY_INTERVAL_MS: 30000,
  MAX_DURATION_MS: 600000,
  RUN_START_GRACE_MS: 100000,
  MAX_CONSECUTIVE_FAILURES: 3,
} as const;

export const ERP_IMPORT_LIST_LIMITS = {
  PROCESSED_LISTING_CAP: 200,
  REJECTED_ORDERS_SHOWN: 50,
  AGGREGATE_TOAST_MIN_FILES: 3,
} as const;

export const ERP_IMPORT_FILE_FAILURE_REASONS = {
  StaleHeartbeat: 'Import interrupted: no progress was reported within the stale threshold.',
  FileChangedAfterReceipt: 'File changed after receipt.',
  StoredFileMissing: 'The stored file no longer exists.',
  ImportAbortedPrefix: 'Import aborted by an unexpected error: ',
  LegacyImportInterrupted: 'The import before the update claimed this file and did not finish it.',
  LegacyErrorWithoutReason: 'The import before the update rejected this file without a recorded reason.',
  LedgerEntryMissing:
    'Stored file without its import record, e.g. after a database restore. Check the content, then retry or delete it.',
  FileTooLarge: 'The file is larger than the maximum size an import can read.',
} as const;

const FILES_KEY_PREFIX = 'settings.erp-drop-points.files.';

export const ERP_IMPORT_FILES_I18N = {
  STATUS_RECEIVED: `${FILES_KEY_PREFIX}status.received`,
  STATUS_IMPORTING: `${FILES_KEY_PREFIX}status.importing`,
  STATUS_IMPORTING_PROGRESS: `${FILES_KEY_PREFIX}status.importing-progress`,
  STATUS_COMPLETED: `${FILES_KEY_PREFIX}status.completed`,
  STATUS_COMPLETED_WITH_WARNINGS: `${FILES_KEY_PREFIX}status.completed-with-warnings`,
  CHANNEL_UI_UPLOAD: `${FILES_KEY_PREFIX}channel.ui-upload`,
  CHANNEL_TOKEN_PUSH: `${FILES_KEY_PREFIX}channel.token-push`,
  CHANNEL_INBOX_FOLDER: `${FILES_KEY_PREFIX}channel.inbox-folder`,
  SUMMARY_NEW: `${FILES_KEY_PREFIX}summary.new`,
  SUMMARY_UPDATED: `${FILES_KEY_PREFIX}summary.updated`,
  SUMMARY_UNCHANGED: `${FILES_KEY_PREFIX}summary.unchanged`,
  SUMMARY_SUPERSEDED: `${FILES_KEY_PREFIX}summary.superseded`,
  SUMMARY_REJECTED: `${FILES_KEY_PREFIX}summary.rejected`,
  TOAST_COMPLETED: `${FILES_KEY_PREFIX}toast.completed`,
  TOAST_COMPLETED_WITH_WARNINGS: `${FILES_KEY_PREFIX}toast.completed-with-warnings`,
  TOAST_FAILED: `${FILES_KEY_PREFIX}toast.failed`,
  IMPORT_STILL_RUNNING: `${FILES_KEY_PREFIX}import-still-running`,
  SUCCESS_RETRY_QUEUED: `${FILES_KEY_PREFIX}success.retry-queued`,
  SUCCESS_DELETE: `${FILES_KEY_PREFIX}success.delete`,
  ERROR_LOAD: `${FILES_KEY_PREFIX}error.load`,
  ERROR_RETRY: `${FILES_KEY_PREFIX}error.retry`,
  ERROR_DELETE: `${FILES_KEY_PREFIX}error.delete`,
  ERROR_NOT_FOUND: `${FILES_KEY_PREFIX}error.not-found`,
  ERROR_WRONG_STATUS: `${FILES_KEY_PREFIX}error.wrong-status`,
  ERROR_CONFLICT: `${FILES_KEY_PREFIX}error.conflict`,
  FAILURE_STALE_HEARTBEAT: `${FILES_KEY_PREFIX}failure.stale-heartbeat`,
  FAILURE_FILE_CHANGED: `${FILES_KEY_PREFIX}failure.file-changed`,
  FAILURE_FILE_MISSING: `${FILES_KEY_PREFIX}failure.file-missing`,
  FAILURE_IMPORT_ABORTED: `${FILES_KEY_PREFIX}failure.import-aborted`,
  FAILURE_LEGACY_INTERRUPTED: `${FILES_KEY_PREFIX}failure.legacy-interrupted`,
  FAILURE_LEGACY_ERROR: `${FILES_KEY_PREFIX}failure.legacy-error`,
  FAILURE_LEDGER_ENTRY_MISSING: `${FILES_KEY_PREFIX}failure.ledger-entry-missing`,
  FAILURE_FILE_TOO_LARGE: `${FILES_KEY_PREFIX}failure.file-too-large`,
  REJECTED_ORDERS_TOGGLE: `${FILES_KEY_PREFIX}rejected-orders.toggle`,
  REJECTED_WITHOUT_REFERENCE: `${FILES_KEY_PREFIX}rejected-orders.without-reference`,
  DUPLICATE_HINT: `${FILES_KEY_PREFIX}duplicate-hint`,
  HEADLINE: `${FILES_KEY_PREFIX}headline`,
  REFRESH: `${FILES_KEY_PREFIX}refresh`,
  TAB_PENDING: `${FILES_KEY_PREFIX}tab.pending`,
  TAB_PROCESSED: `${FILES_KEY_PREFIX}tab.processed`,
  TAB_ERROR: `${FILES_KEY_PREFIX}tab.error`,
  HEADER_EXPAND: `${FILES_KEY_PREFIX}header.expand`,
  HEADER_FILE_NAME: `${FILES_KEY_PREFIX}header.file-name`,
  HEADER_SIZE: `${FILES_KEY_PREFIX}header.size`,
  HEADER_DATE: `${FILES_KEY_PREFIX}header.date`,
  HEADER_SOURCE: `${FILES_KEY_PREFIX}header.source`,
  HEADER_STATUS: `${FILES_KEY_PREFIX}header.status`,
  HEADER_RESULT: `${FILES_KEY_PREFIX}header.result`,
  HEADER_ERROR_REASON: `${FILES_KEY_PREFIX}header.error-reason`,
  HEADER_ACTIONS: `${FILES_KEY_PREFIX}header.actions`,
  EMPTY: `${FILES_KEY_PREFIX}empty`,
  RETRY: `${FILES_KEY_PREFIX}retry`,
  DELETE: `${FILES_KEY_PREFIX}delete`,
  CONFIRM_DELETE: `${FILES_KEY_PREFIX}confirm-delete`,
  PROCESSED_CAP_HINT: `${FILES_KEY_PREFIX}processed-cap-hint`,
  REJECTED_MORE: `${FILES_KEY_PREFIX}rejected-orders.more`,
  TOAST_AGGREGATE: `${FILES_KEY_PREFIX}toast.aggregate`,
  TOAST_AGGREGATE_WITH_FAILURES: `${FILES_KEY_PREFIX}toast.aggregate-with-failures`,
  UPLOAD_REJECTED: `${FILES_KEY_PREFIX}upload-rejected.other`,
  UPLOAD_REJECTED_EMPTY_FILE: `${FILES_KEY_PREFIX}upload-rejected.empty-file`,
  UPLOAD_REJECTED_EMPTY_FILE_NAME: `${FILES_KEY_PREFIX}upload-rejected.empty-file-name`,
  UPLOAD_REJECTED_FILE_TOO_LARGE: `${FILES_KEY_PREFIX}upload-rejected.file-too-large`,
} as const;

const PAGE_KEY_PREFIX = 'settings.erp-drop-points.';

export const ERP_DROP_POINT_I18N = {
  ERROR_LOAD: `${PAGE_KEY_PREFIX}error.load`,
  ERROR_SAVE: `${PAGE_KEY_PREFIX}error.save`,
  ERROR_UPLOAD: `${PAGE_KEY_PREFIX}error.upload`,
  ERROR_INVALID_FILE_TYPE: `${PAGE_KEY_PREFIX}error.invalid-file-type`,
  ERROR_RUN_IMPORT: `${PAGE_KEY_PREFIX}error.run-import`,
  SUCCESS_UPDATE: `${PAGE_KEY_PREFIX}success.update`,
  SUCCESS_UPLOAD: `${PAGE_KEY_PREFIX}success.upload`,
  SUCCESS_RUN_IMPORT: `${PAGE_KEY_PREFIX}success.run-import`,
} as const;

export const ERP_ORDER_UPLOAD_VALIDATION_MESSAGES = {
  EmptyFile: 'File must not be empty.',
  EmptyFileName: 'File name must not be empty.',
  InvalidExtension: 'Only .xml files are allowed.',
  FileTooLarge: 'File exceeds the maximum allowed size.',
} as const;

export const ERP_IMPORT_SUMMARY_SEPARATOR = ' · ';
