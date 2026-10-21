// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface GeoServiceStatusRow {
  id: string;
  labelKey: string;
  enabled: boolean;
  reasonKey: string | null;
}
