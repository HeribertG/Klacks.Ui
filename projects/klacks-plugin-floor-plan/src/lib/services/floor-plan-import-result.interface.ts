// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export type FloorPlanImportType = 'svg' | 'dxf' | 'bitmap';

export interface FloorPlanImportResult {
  type: FloorPlanImportType;
  data: string;
}
