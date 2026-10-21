// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ErpImportChannel } from 'src/app/domain/enums/erp-import-channel.enum';
import { ErpImportFileStatus } from 'src/app/domain/enums/erp-import-file-status.enum';
import { IErpDropPointFiles } from 'src/app/domain/models/settings/erp-drop-point-files.interface';
import { IErpImportFile } from 'src/app/domain/models/settings/erp-import-file';
import {
  ERP_IMPORT_FILES_I18N,
  ERP_ORDER_UPLOAD_VALIDATION_MESSAGES,
} from 'src/app/domain/constants/erp-import-file.constants';
import {
  erpImportCountSummary,
  erpImportUploadRejectionText,
  hasImportingErpImportFiles,
  hasPendingErpImportFiles,
  isErpImportFilePending,
  isErpImportFileTerminal,
  sumErpImportCounts,
} from './erp-import-file.helper';
import { ErpImportFileTransitionTracker } from './erp-import-file-transition-tracker';

const UNKNOWN_STATUS = 99 as ErpImportFileStatus;

const importFile = (id: string, status: ErpImportFileStatus, overrides: Partial<IErpImportFile> = {}): IErpImportFile => ({
  id,
  fileName: `${id}.xml`,
  sizeBytes: 1,
  status,
  channel: ErpImportChannel.UiUpload,
  uploadedBy: null,
  receivedAt: '2026-10-19T08:00:00Z',
  startedAt: null,
  finishedAt: null,
  processedOrders: 0,
  totalOrders: 0,
  newCount: 0,
  updatedCount: 0,
  unchangedCount: 0,
  supersededCount: 0,
  rejectedCount: 0,
  failureReason: null,
  duplicateOfReceivedAt: null,
  rejectedOrders: [],
  ...overrides,
});

const inbox = (...rows: IErpImportFile[]): IErpDropPointFiles => ({ inbox: rows, processed: [], failed: [] });

describe('erp-import-file.helper', () => {
  describe('status lists', () => {
    it.each([
      [ErpImportFileStatus.Received, true, false],
      [ErpImportFileStatus.Importing, true, false],
      [ErpImportFileStatus.Completed, false, true],
      [ErpImportFileStatus.CompletedWithWarnings, false, true],
      [ErpImportFileStatus.Failed, false, true],
      [ErpImportFileStatus.Interrupted, false, true],
      [UNKNOWN_STATUS, false, false],
    ])('classifies status %s as pending=%s, terminal=%s', (status, isPending, isTerminal) => {
      expect(isErpImportFilePending(status)).toBe(isPending);
      expect(isErpImportFileTerminal(status)).toBe(isTerminal);
    });

    it('treats a listing with only an unknown status as neither pending nor importing', () => {
      const files = inbox(importFile('x', UNKNOWN_STATUS));

      expect(hasPendingErpImportFiles(files)).toBe(false);
      expect(hasImportingErpImportFiles(files)).toBe(false);
    });

    it('tells an importing file apart from a merely waiting one', () => {
      expect(hasImportingErpImportFiles(inbox(importFile('a', ErpImportFileStatus.Received)))).toBe(false);
      expect(hasImportingErpImportFiles(inbox(importFile('a', ErpImportFileStatus.Importing)))).toBe(true);
    });
  });

  describe('erpImportCountSummary', () => {
    it('hides zero counters', () => {
      const parts = erpImportCountSummary(importFile('a', ErpImportFileStatus.Completed, { newCount: 2, rejectedCount: 1 }));

      expect(parts.map((part) => part.key)).toEqual([ERP_IMPORT_FILES_I18N.SUMMARY_NEW, ERP_IMPORT_FILES_I18N.SUMMARY_REJECTED]);
    });

    it('keeps the only non-zero counter', () => {
      const parts = erpImportCountSummary(importFile('a', ErpImportFileStatus.Completed, { unchangedCount: 620 }));

      expect(parts).toEqual([{ key: ERP_IMPORT_FILES_I18N.SUMMARY_UNCHANGED, params: { count: 620 } }]);
    });

    it('shows "0 new" instead of nothing when every counter is zero', () => {
      expect(erpImportCountSummary(importFile('a', ErpImportFileStatus.Completed))).toEqual([
        { key: ERP_IMPORT_FILES_I18N.SUMMARY_NEW, params: { count: 0 } },
      ]);
    });

    it('sums the counters of several files', () => {
      const sum = sumErpImportCounts([
        importFile('a', ErpImportFileStatus.Completed, { newCount: 2, updatedCount: 1 }),
        importFile('b', ErpImportFileStatus.Completed, { newCount: 3, supersededCount: 4, rejectedCount: 1 }),
      ]);

      expect(sum).toEqual({ newCount: 5, updatedCount: 1, unchangedCount: 0, supersededCount: 4, rejectedCount: 1 });
    });
  });

  describe('erpImportUploadRejectionText', () => {
    it('maps a fixed validator message in a plain-text body to its own key', () => {
      expect(erpImportUploadRejectionText(ERP_ORDER_UPLOAD_VALIDATION_MESSAGES.EmptyFile)).toEqual({
        key: ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED_EMPTY_FILE,
        params: {},
      });
    });

    it('reads the detail of a ProblemDetails body', () => {
      expect(erpImportUploadRejectionText({ detail: ERP_ORDER_UPLOAD_VALIDATION_MESSAGES.FileTooLarge })).toEqual({
        key: ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED_FILE_TOO_LARGE,
        params: {},
      });
    });

    it('shows an unknown message raw', () => {
      expect(erpImportUploadRejectionText('Storage quota exceeded.')).toEqual({
        key: ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED,
        params: { detail: 'Storage quota exceeded.' },
      });
    });

    it.each([null, undefined, '', '   ', { title: 'Bad Request' }, { detail: 42 }])('returns null for %o', (body) => {
      expect(erpImportUploadRejectionText(body)).toBeNull();
    });
  });

  describe('ErpImportFileTransitionTracker', () => {
    it('never reports a file whose status the UI does not know', () => {
      const tracker = new ErpImportFileTransitionTracker();
      tracker.update(inbox(importFile('a', ErpImportFileStatus.Importing)), true);

      const finished = tracker.update(inbox(importFile('a', UNKNOWN_STATUS), importFile('b', UNKNOWN_STATUS)), true);

      expect(finished).toEqual([]);
    });

    it('reports a file that moved from pending to terminal', () => {
      const tracker = new ErpImportFileTransitionTracker();
      tracker.update(inbox(importFile('a', ErpImportFileStatus.Importing)), false);

      const finished = tracker.update(inbox(importFile('a', ErpImportFileStatus.Completed)), false);

      expect(finished.map((file) => file.id)).toEqual(['a']);
    });
  });
});
