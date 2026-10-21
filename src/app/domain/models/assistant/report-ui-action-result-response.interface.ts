// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IReportUiActionResultResponse {
  found: boolean;
  updated: boolean;
  error: string | null;
}
