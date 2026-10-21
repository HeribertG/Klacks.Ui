// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Remembers the last seen status of every ERP import file and reports the files whose import finished since
 * the previous listing, so each finished import is announced exactly once. The first listing after a reset
 * is only the baseline (nothing is reported). A file seen before in a pending status (Received/Importing)
 * and now terminal is reported; a file not seen before is reported only when it is already terminal AND
 * reportUnseen is set (an active polling session after an upload, where a small file can be imported before
 * the first listing shows it). A status the UI does not know is neither pending nor terminal and never reported. rearm marks a retried file as pending again so its next terminal status is
 * reported even if the listing never shows it pending.
 * @param files - The current listing grouped into inbox, processed and failed
 * @param reportUnseen - Whether a terminal file that was not in the previous listing counts as finished
 * @param id - Ledger row id of a file whose retry was accepted
 */

import { ErpImportFileStatus } from 'src/app/domain/enums/erp-import-file-status.enum';
import { IErpDropPointFiles } from 'src/app/domain/models/settings/erp-drop-point-files.interface';
import { IErpImportFile } from 'src/app/domain/models/settings/erp-import-file';
import {
  allErpImportFiles,
  isErpImportFilePending,
  isErpImportFileTerminal,
} from 'src/app/domain/helpers/erp-import-file.helper';

export class ErpImportFileTransitionTracker {
  private knownStatuses: Map<string, ErpImportFileStatus> | null = null;

  reset(): void {
    this.knownStatuses = null;
  }

  rearm(id: string): void {
    this.knownStatuses?.set(id, ErpImportFileStatus.Received);
  }

  update(files: IErpDropPointFiles, reportUnseen: boolean): IErpImportFile[] {
    const current = allErpImportFiles(files);
    const previous = this.knownStatuses;
    this.knownStatuses = new Map(current.map((file) => [file.id, file.status]));

    if (previous === null) {
      return [];
    }

    return current.filter((file) => {
      if (!isErpImportFileTerminal(file.status)) {
        return false;
      }
      const previousStatus = previous.get(file.id);
      return previousStatus === undefined ? reportUnseen : isErpImportFilePending(previousStatus);
    });
  }
}
