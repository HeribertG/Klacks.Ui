// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
