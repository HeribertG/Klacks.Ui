// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ExportLog {
  id: string;
  format: string;
  startDate: string;
  endDate: string;
  groupId: string | null;
  groupName: string | null;
  language: string;
  currencyCode: string;
  fileName: string;
  fileSize: number;
  recordCount: number;
  exportedAt: string;
  exportedBy: string;
  exportedByName: string | null;
}
