// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IClientImportIssue } from './i-client-import-issue';

export interface IClientImportIssueSummaryEntry {
  issue: IClientImportIssue;
  rowCount: number;
}
