// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IExportFormatOverride {
  formatKey: string;
  patchJson: string;
  isEnabled: boolean;
  note: string | null;
  createdUnderVersion: string;
  updateTime: string | null;
}
